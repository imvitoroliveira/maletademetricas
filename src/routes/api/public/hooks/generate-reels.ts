import { createFileRoute } from "@tanstack/react-router";

/**
 * Rotina agendada (pg_cron) que verifica os canais de referência ativos de todos
 * os usuários e gera roteiros de Reels para os vídeos em alta.
 * Protegida pela apikey do projeto enviada pelo cron.
 */
export const Route = createFileRoute("/api/public/hooks/generate-reels")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { generateReelsForChannels } = await import("@/lib/reels-engine.server");

          const { data: channels, error } = await supabaseAdmin
            .from("reels_reference_channels")
            .select("id, user_id, channel_input, channel_id, channel_name")
            .eq("is_active", true);
          if (error) throw new Error(error.message);

          const result = await generateReelsForChannels(supabaseAdmin, channels ?? [], {
            perChannel: 2,
          });

          return new Response(
            JSON.stringify({ success: true, channels: channels?.length ?? 0, ...result }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "Erro desconhecido";
          console.error("[generate-reels] falha:", message);
          return new Response(JSON.stringify({ success: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
