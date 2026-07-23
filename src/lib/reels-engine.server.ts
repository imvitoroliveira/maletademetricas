/**
 * Engine server-only de geração de roteiros de Reels a partir de canais de referência do YouTube.
 * Usado tanto pela rotina agendada (service role) quanto pela geração manual (cliente do usuário).
 */
import { generateText, Output } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolveChannel, getRecentVideos, pickTrending, type YoutubeVideo } from "./youtube.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type DB = SupabaseClient<Database>;

export type ChannelForRun = {
  id: string;
  user_id: string;
  channel_input: string;
  channel_id: string | null;
  channel_name: string | null;
};

const ScriptSchema = z.object({
  theme: z.string(),
  title: z.string(),
  hook: z.string(),
  scenes: z.array(z.object({ time: z.string(), visual: z.string(), speech: z.string() })),
  cta: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

type GeneratedScript = z.infer<typeof ScriptSchema>;

async function generateScript(
  gateway: ReturnType<typeof createLovableAiGatewayProvider>,
  video: YoutubeVideo,
  channelName: string,
): Promise<GeneratedScript> {
  const { output } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    output: Output.object({ schema: ScriptSchema }),
    prompt: `Você é um roteirista especialista em conteúdo viral de Instagram Reels no nicho de MARKETING DIGITAL e CAMPANHAS ONLINE.

Um vídeo do YouTube do canal de referência "${channelName}" está em alta:
Título: ${video.title}
Descrição: ${video.description.slice(0, 1200)}
Views: ${video.views}

Sua missão: captar o ASSUNTO PRINCIPAL desse vídeo e transformá-lo em um roteiro ORIGINAL de Reels (não copie, recrie com narrativa própria). Siga estes pilares com rigor:

1. IDEIA BOA E ORIGINAL: aproveite o tema, mas traga um ângulo/narrativa nossa. Nada de cópia óbvia.
2. EMBALAGEM: faça o público sentir que está aprendendo algo valioso, mesmo que rápido — dinâmico e espontâneo.
3. RETENÇÃO: estrutura que prende do início ao fim e cria conexão pessoal com quem assiste.
4. ATENÇÃO: gancho que segura nos 3 primeiros segundos e quebras de padrão ao longo das cenas.
5. ORIGINALIDADE: mesmo que o público já tenha visto o tema no YouTube, não pode parecer repetitivo.
6. CONSISTÊNCIA: mantenha sempre o foco em marketing digital, com linguagem próxima, humana e SEM jargão técnico ou robótico.

Regras de formato:
- "theme": o assunto central em poucas palavras.
- "hook": fala de impacto para os primeiros 3 segundos.
- "scenes": cenas com marcação de tempo (ex.: "0-3s"), descrição visual e a fala/texto na tela. Duração total de ~30 segundos.
- "cta": chamada para ação forte e natural.
- "caption": legenda pronta para postar, com tom próximo do público.
- "hashtags": 8 a 15 hashtags relevantes de marketing digital, sem o símbolo #.
Tudo em português do Brasil.`,
  });
  return output;
}

const DEFAULT_MAX_CHANNELS = 5;

export async function generateReelsForChannels(
  db: DB,
  channels: ChannelForRun[],
  opts: { perChannel?: number } = {},
): Promise<{ created: number; errors: number; skippedUsers: number; processedUsers: number }> {
  const perChannel = opts.perChannel ?? 2;
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente.");
  const gateway = createLovableAiGatewayProvider(key);

  // Group channels by user so quota checks happen once per user.
  const byUser = new Map<string, ChannelForRun[]>();
  for (const ch of channels) {
    const list = byUser.get(ch.user_id) ?? [];
    list.push(ch);
    byUser.set(ch.user_id, list);
  }

  let created = 0;
  let errors = 0;
  let skippedUsers = 0;
  let processedUsers = 0;

  for (const [userId, userChannels] of byUser) {
    // Load per-user quota config.
    const { data: profile } = await db
      .from("profiles")
      .select("reels_max_channels, reels_generation_enabled")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.reels_generation_enabled) {
      skippedUsers++;
      continue;
    }

    // Atomically consume one daily run; NULL means disabled or cap reached.
    const { data: runsToday, error: rpcError } = await db.rpc("try_consume_reels_run", {
      _user_id: userId,
    });
    if (rpcError) {
      errors++;
      console.error(`[reels-engine] quota rpc falhou para ${userId}:`, rpcError.message);
      continue;
    }
    if (runsToday == null) {
      skippedUsers++;
      continue;
    }

    processedUsers++;
    const maxChannels = profile?.reels_max_channels ?? DEFAULT_MAX_CHANNELS;
    const scoped = userChannels.slice(0, Math.max(0, maxChannels));
    let createdForUser = 0;

    for (const ch of scoped) {
      try {
        let channelId = ch.channel_id;
        let channelName = ch.channel_name ?? ch.channel_input;

        if (!channelId) {
          const resolved = await resolveChannel(ch.channel_input);
          channelId = resolved.channelId;
          channelName = resolved.channelName;
          await db
            .from("reels_reference_channels")
            .update({
              channel_id: resolved.channelId,
              channel_name: resolved.channelName,
              channel_url: resolved.channelUrl,
            })
            .eq("id", ch.id);
        }

        const videos = await getRecentVideos(channelId, 15);
        const trending = pickTrending(videos, 30, perChannel + 4);

        if (trending.length > 0) {
          const { data: existing } = await db
            .from("reels_scripts")
            .select("source_video_id")
            .eq("user_id", ch.user_id);
          const seen = new Set((existing ?? []).map((e) => e.source_video_id));
          const fresh = trending.filter((v) => !seen.has(v.videoId)).slice(0, perChannel);

          for (const video of fresh) {
            const script = await generateScript(gateway, video, channelName);
            const { error } = await db.from("reels_scripts").insert({
              user_id: ch.user_id,
              channel_id: ch.id,
              source_video_id: video.videoId,
              source_video_title: video.title,
              source_video_url: video.url,
              source_channel_name: channelName,
              source_views: video.views,
              theme: script.theme,
              title: script.title,
              hook: script.hook,
              scenes: script.scenes,
              cta: script.cta,
              caption: script.caption,
              hashtags: script.hashtags,
              status: "new",
            });
            if (!error) {
              created++;
              createdForUser++;
            }
          }
        }

        await db
          .from("reels_reference_channels")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", ch.id);
      } catch (e) {
        errors++;
        console.error(`[reels-engine] erro no canal ${ch.id}:`, e);
      }
    }

    if (createdForUser > 0) {
      const { error: recError } = await db.rpc("record_reels_generation", {
        _user_id: userId,
        _scripts_created: createdForUser,
      });
      if (recError) console.error(`[reels-engine] record rpc falhou para ${userId}:`, recError.message);
    }
  }

  return { created, errors, skippedUsers, processedUsers };
}

