import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Meta (Facebook / Instagram) Graph API integrations. Migrated from
// supabase/functions/test-meta-connection and sync-meta-campaigns.

const GRAPH_VERSION = "v19.0";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !isAdmin) throw new Error("Forbidden: Admin access required");
}

export const testMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      accountId: z.string().min(1),
      accessToken: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const actId = data.accountId.startsWith("act_") ? data.accountId : `act_${data.accountId}`;
    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${actId}` +
      `?fields=name,account_status,currency,amount_spent` +
      `&access_token=${encodeURIComponent(data.accessToken)}`;

    const resp = await fetch(url);
    const payload: any = await resp.json();
    if (!resp.ok || payload?.error) {
      return {
        ok: false as const,
        error: payload?.error?.message ?? `Falha na conexão (HTTP ${resp.status}). Verifique o ID e o token.`,
      };
    }

    const statusMap: Record<number, string> = {
      1: "Ativa", 2: "Desativada", 3: "Sem autorização",
      7: "Em revisão", 9: "Em período de carência", 100: "Pendente de fechamento",
    };
    return {
      ok: true as const,
      account: {
        name: payload.name ?? actId,
        status: statusMap[payload.account_status] ?? "Desconhecido",
        currency: payload.currency ?? null,
      },
    };
  });

export type SyncResult = { account: string; status: "ok" | "error" | "skipped"; reason?: string; count?: number };

export const syncMetaCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ adAccountId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ results: SyncResult[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let accountsQuery = supabaseAdmin.from("ad_accounts").select("id, name, account_id");
    if (data.adAccountId) accountsQuery = accountsQuery.eq("id", data.adAccountId);
    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) throw new Error(accountsError.message);

    const results: SyncResult[] = [];
    for (const acc of accounts ?? []) {
      const { data: secretRows, error: secretError } = await supabaseAdmin
        .rpc("get_ad_account_secret", { p_id: acc.id });
      const accessToken: string | null = (secretRows as any)?.[0]?.access_token ?? null;
      if (secretError || !accessToken || !acc.account_id) {
        results.push({ account: acc.name, status: "skipped", reason: "Credenciais ausentes" });
        continue;
      }

      const actId = String(acc.account_id).startsWith("act_") ? String(acc.account_id) : `act_${acc.account_id}`;
      const url =
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/campaigns` +
        `?fields=name,status,objective,daily_budget,insights{spend,reach,impressions,clicks,ctr}` +
        `&limit=100&access_token=${encodeURIComponent(accessToken)}`;

      let payload: any;
      try {
        const resp = await fetch(url);
        payload = await resp.json();
        if (!resp.ok || payload?.error) {
          results.push({ account: acc.name, status: "error", reason: payload?.error?.message ?? `HTTP ${resp.status}` });
          continue;
        }
      } catch (e) {
        results.push({ account: acc.name, status: "error", reason: (e as Error).message });
        continue;
      }

      const rows = (payload.data ?? []).map((c: any) => {
        const ins = c.insights?.data?.[0] ?? {};
        return {
          ad_account_id: acc.id,
          remote_campaign_id: c.id,
          name: c.name ?? "Sem nome",
          status: c.status ?? "UNKNOWN",
          objective: c.objective ?? null,
          budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
          spent: ins.spend ? Number(ins.spend) : 0,
          reach: ins.reach ? Number(ins.reach) : 0,
          impressions: ins.impressions ? Number(ins.impressions) : 0,
          clicks: ins.clicks ? Number(ins.clicks) : 0,
          ctr: ins.ctr ? Number(ins.ctr) : 0,
          updated_at: new Date().toISOString(),
        };
      });

      if (rows.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("campaigns")
          .upsert(rows, { onConflict: "ad_account_id,remote_campaign_id" });
        if (upsertError) {
          results.push({ account: acc.name, status: "error", reason: upsertError.message });
          continue;
        }
      }
      results.push({ account: acc.name, status: "ok", count: rows.length });
    }
    return { results };
  });
