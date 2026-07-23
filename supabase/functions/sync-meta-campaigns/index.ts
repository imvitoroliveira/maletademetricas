import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRAPH_VERSION = "v19.0";

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the caller as an admin (RLS-aware client with the user's token)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return json({ error: "Forbidden: Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetAccountId: string | undefined = body?.adAccountId;

    // Service-role client to read credentials and write campaigns (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let accountsQuery = supabaseAdmin
      .from("ad_accounts")
      .select("id, name, account_id");
    if (targetAccountId) accountsQuery = accountsQuery.eq("id", targetAccountId);

    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) throw accountsError;

    const results: Array<Record<string, unknown>> = [];

    for (const acc of accounts ?? []) {
      // Recupera o token decifrado (RPC SECURITY DEFINER, restrita a service_role)
      const { data: secretRows, error: secretError } = await supabaseAdmin
        .rpc("get_ad_account_secret", { p_id: acc.id });
      const accessToken: string | null = secretRows?.[0]?.access_token ?? null;

      if (secretError || !accessToken || !acc.account_id) {
        results.push({ account: acc.name, status: "skipped", reason: "Credenciais ausentes" });
        continue;
      }

      const actId = String(acc.account_id).startsWith("act_")
        ? String(acc.account_id)
        : `act_${acc.account_id}`;

      const url =
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/campaigns` +
        `?fields=name,status,objective,daily_budget,` +
        `insights{spend,reach,impressions,clicks,ctr}` +
        `&limit=100&access_token=${encodeURIComponent(accessToken)}`;

      let payload: any;
      try {
        const resp = await fetch(url);
        payload = await resp.json();
        if (!resp.ok || payload?.error) {
          results.push({
            account: acc.name,
            status: "error",
            reason: payload?.error?.message ?? `HTTP ${resp.status}`,
          });
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

    return json({ results }, 200);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
