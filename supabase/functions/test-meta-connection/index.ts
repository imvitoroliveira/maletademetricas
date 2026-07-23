import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_VERSION = "v19.0";

function json(req: Request, obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
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
    if (authError || !user) return json(req, { ok: false, error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseClient
      .rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return json(req, { ok: false, error: "Acesso restrito a administradores." }, 403);
    }


    const body = await req.json().catch(() => ({}));
    const accountId: string | undefined = body?.accountId;
    const accessToken: string | undefined = body?.accessToken;

    if (!accountId || !accessToken) {
      return json(req, { ok: false, error: "Informe o ID da conta e o token de acesso." }, 400);
    }

    const actId = String(accountId).startsWith("act_")
      ? String(accountId)
      : `act_${accountId}`;

    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${actId}` +
      `?fields=name,account_status,currency,amount_spent` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const resp = await fetch(url);
    const payload = await resp.json();

    if (!resp.ok || payload?.error) {
      return json(req, 
        {
          ok: false,
          error:
            payload?.error?.message ??
            `Falha na conexão (HTTP ${resp.status}). Verifique o ID e o token.`,
        },
        200,
      );
    }

    const statusMap: Record<number, string> = {
      1: "Ativa",
      2: "Desativada",
      3: "Sem autorização",
      7: "Em revisão",
      9: "Em período de carência",
      100: "Pendente de fechamento",
    };

    return json(req, 
      {
        ok: true,
        account: {
          name: payload.name ?? actId,
          status: statusMap[payload.account_status] ?? "Desconhecido",
          currency: payload.currency ?? null,
        },
      },
      200,
    );
  } catch (error) {
    return json(req, { ok: false, error: (error as Error).message }, 500);
  }
});
