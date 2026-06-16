import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hashPassword } from "../_shared/crypto.ts";

// Vault password recovery. Requires authentication; a caller may only recover
// their OWN vault password. New passwords are stored hashed.
serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.email) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { type, token, newPassword } = await req.json();
    // Always operate on the caller's own account.
    const email = user.email;

    if (type === "request") {
      const recoveryToken = crypto.randomUUID().substring(0, 8).toUpperCase();
      const expires = new Date(Date.now() + 3600000);

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .update({
          vault_recovery_token: recoveryToken,
          vault_recovery_expires: expires.toISOString(),
        })
        .eq("id", user.id)
        .select("id")
        .single();

      if (profileError || !profile) return json({ error: "Usuário não encontrado." }, 404);

      // The token is intentionally NOT returned in the response body. It must be
      // delivered out-of-band (e.g. via email) so it acts as a real second factor.
      // Returning it here would let a session-level attacker reset the vault password.
      return json({
        message:
          "Se a conta existir, um token de recuperação foi enviado para o e-mail cadastrado.",
      });
    }

    if (type === "reset") {
      if (!newPassword || String(newPassword).length < 4) {
        return json({ error: "A nova senha deve ter ao menos 4 caracteres." }, 400);
      }

      const { data: profile, error: fetchError } = await admin
        .from("profiles")
        .select("id, vault_recovery_token, vault_recovery_expires")
        .eq("id", user.id)
        .single();

      if (fetchError || !profile) return json({ error: "Solicitação inválida." }, 400);

      const now = new Date();
      const expires = new Date(profile.vault_recovery_expires);
      if (!profile.vault_recovery_token || profile.vault_recovery_token !== token || now > expires) {
        return json({ error: "Token inválido ou expirado." }, 400);
      }

      const hashed = await hashPassword(String(newPassword));
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          vault_password: hashed,
          vault_recovery_token: null,
          vault_recovery_expires: null,
        })
        .eq("id", profile.id);

      if (updateError) return json({ error: updateError.message }, 400);
      return json({ message: "Senha do cofre redefinida com sucesso!" });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});
