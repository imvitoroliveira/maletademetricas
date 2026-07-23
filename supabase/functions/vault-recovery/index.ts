import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hashPassword, verifyPassword } from "../_shared/crypto.ts";

// Email-token recovery flow for the vault master password.
//
// Security guarantees:
//   * The plaintext token is generated server-side, delivered ONLY via email
//     (Resend), and NEVER returned in the HTTP response body.
//   * Only a PBKDF2 hash of the token is persisted, in a column that is
//     REVOKEd from anon/authenticated (only service_role can read/write it).
//   * "request" always returns the same generic message, regardless of
//     whether the account exists or the email was actually sent — no user
//     enumeration and no side-channel about email deliverability.
//   * If RESEND_API_KEY is not configured, the endpoint returns the generic
//     "if the account exists, a token was sent" message but does not create
//     a usable token (we don't want silent, undelivered recoveries).
async function sendRecoveryEmail(to: string, token: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("VAULT_RECOVERY_FROM") ?? "Cofre <onboarding@resend.dev>";
  if (!apiKey) return false;

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:auto;padding:24px;">
      <h2 style="color:#a21caf;margin:0 0 12px;">Recuperação da senha do cofre</h2>
      <p>Você solicitou a troca da senha mestre do cofre de contingência.</p>
      <p>Use o token abaixo. Ele expira em 1 hora e só pode ser usado uma vez:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#faf5ff;padding:16px 20px;border-radius:8px;text-align:center;color:#701a75;">${token}</p>
      <p style="color:#64748b;font-size:13px;">Se você não solicitou esta recuperação, ignore este e-mail e nenhuma alteração será feita.</p>
    </div>
  `;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Token de recuperação do cofre",
        html,
      }),
    });
    if (!resp.ok) {
      console.error("Resend send failed", resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send exception", err);
    return false;
  }
}

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
    const genericOk = {
      message:
        "Se a conta existir, um token de recuperação foi enviado para o e-mail cadastrado.",
    };

    if (type === "request") {
      // Generate a plaintext token, send it by email, and only persist the
      // hash. If email delivery is not configured, we skip persistence so a
      // token that nobody can receive is never accepted.
      const plainToken = crypto.randomUUID().slice(0, 8).toUpperCase();
      const emailed = await sendRecoveryEmail(user.email, plainToken);
      if (!emailed) return json(genericOk);

      const tokenHash = await hashPassword(plainToken);
      const expires = new Date(Date.now() + 3600_000);

      const { error: updateError } = await admin
        .from("profiles")
        .update({
          vault_recovery_token: tokenHash,
          vault_recovery_expires: expires.toISOString(),
        })
        .eq("id", user.id);
      if (updateError) {
        console.error("vault-recovery persist error", updateError);
      }
      return json(genericOk);
    }

    if (type === "reset") {
      if (!newPassword || String(newPassword).length < 4) {
        return json({ error: "A nova senha deve ter ao menos 4 caracteres." }, 400);
      }
      if (!token) return json({ error: "Token obrigatório." }, 400);

      const { data: profile, error: fetchError } = await admin
        .from("profiles")
        .select("id, vault_recovery_token, vault_recovery_expires")
        .eq("id", user.id)
        .single();

      if (fetchError || !profile) return json({ error: "Solicitação inválida." }, 400);

      const expires = profile.vault_recovery_expires
        ? new Date(profile.vault_recovery_expires)
        : null;
      const stillValid = !!expires && new Date() < expires;
      const tokenOk = stillValid && (await verifyPassword(String(token), profile.vault_recovery_token));
      if (!tokenOk) return json({ error: "Token inválido ou expirado." }, 400);

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
    console.error("vault-recovery error", error);
    return json({ error: "Erro interno." }, 500);
  }
});
