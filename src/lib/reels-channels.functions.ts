import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReferenceChannel = {
  id: string;
  channel_input: string;
  channel_id: string | null;
  channel_name: string | null;
  channel_url: string | null;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
};

export type ReelsScriptRow = {
  id: string;
  source_video_title: string | null;
  source_video_url: string | null;
  source_channel_name: string | null;
  source_views: number | null;
  theme: string | null;
  title: string;
  hook: string | null;
  scenes: { time: string; visual: string; speech: string }[];
  cta: string | null;
  caption: string | null;
  hashtags: string[];
  status: string;
  created_at: string;
};

/** Lista os canais de referência do usuário. */
export const listReferenceChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferenceChannel[]> => {
    const { data, error } = await context.supabase
      .from("reels_reference_channels")
      .select("id, channel_input, channel_id, channel_name, channel_url, is_active, last_checked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReferenceChannel[];
  });

/** Adiciona um canal (resolve via YouTube Data API). */
export const addReferenceChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ channel: z.string().min(2).max(300) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ReferenceChannel> => {
    const { resolveChannel } = await import("@/lib/youtube.server");
    const resolved = await resolveChannel(data.channel.trim());

    const { data: inserted, error } = await context.supabase
      .from("reels_reference_channels")
      .insert({
        user_id: context.userId,
        channel_input: data.channel.trim(),
        channel_id: resolved.channelId,
        channel_name: resolved.channelName,
        channel_url: resolved.channelUrl,
      })
      .select("id, channel_input, channel_id, channel_name, channel_url, is_active, last_checked_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return inserted as ReferenceChannel;
  });

/** Ativa/desativa um canal. */
export const toggleReferenceChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reels_reference_channels")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove um canal. */
export const deleteReferenceChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reels_reference_channels")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lista os roteiros gerados do usuário. */
export const listReelsScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReelsScriptRow[]> => {
    const { data, error } = await context.supabase
      .from("reels_scripts")
      .select(
        "id, source_video_title, source_video_url, source_channel_name, source_views, theme, title, hook, scenes, cta, caption, hashtags, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as ReelsScriptRow[];
  });

/** Atualiza o status de um roteiro (new, saved, used). */
export const updateReelsScriptStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "saved", "used"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reels_scripts")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove um roteiro. */
export const deleteReelsScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reels_scripts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera roteiros agora (manual) a partir dos canais ativos do usuário. */
export const generateReelsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ created: number; errors: number }> => {
    await assertAdmin(context);
    const { data: channels, error } = await context.supabase
      .from("reels_reference_channels")
      .select("id, user_id, channel_input, channel_id, channel_name")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    if (!channels || channels.length === 0) {
      throw new Error("Adicione ao menos um canal de referência ativo.");
    }
    const { generateReelsForChannels } = await import("@/lib/reels-engine.server");
    return generateReelsForChannels(context.supabase, channels);
  });
