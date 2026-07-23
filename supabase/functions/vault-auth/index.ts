import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hashPassword, verifyPassword } from "../_shared/crypto.ts";

// Vault master-password management. The hash NEVER leaves the server.
// Actions (all scoped to the authenticated caller's own profile):
//   - "status":            { configured }
//   - "verify":            { valid, configured }
//   - "set":               { success }   (validates currentPassword)
//   - "reset-with-login":  { success }   (validates the user's Supabase login
//                                        password instead of the current vault
//                                        password — the "strong" recovery path)
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { action, password, currentPassword, newPassword, loginPassword } = await req.json();

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, vault_password")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return json({ error: "Perfil não encontrado." }, 404);

    const configured = !!profile.vault_password;

    if (action === "status") {
      return json({ configured });
    }

    if (action === "verify") {
      if (!configured) return json({ valid: false, configured: false });
      const stored = String(profile.vault_password);
      const supplied = String(password ?? "");
      const isHashed = stored.startsWith("pbkdf2$");

      let valid: boolean;
      if (isHashed) {
        valid = await verifyPassword(supplied, stored);
      } else {
        // Legacy plaintext value (set directly in DB). Compare directly and,
        // on success, upgrade it to a secure hash transparently.
        valid = supplied === stored;
        if (valid) {
          const upgraded = await hashPassword(supplied);
          await admin.from("profiles").update({ vault_password: upgraded }).eq("id", user.id);
        }
      }
      return json({ valid, configured: true });
    }

    if (action === "set") {
      if (!newPassword || String(newPassword).length < 4) {
        return json({ error: "A nova senha deve ter ao menos 4 caracteres." }, 400);
      }
      if (configured) {
        const stored = String(profile.vault_password);
        const supplied = String(currentPassword ?? "");
        const ok = stored.startsWith("pbkdf2$")
          ? await verifyPassword(supplied, stored)
          : supplied === stored;
        if (!ok) return json({ error: "A senha atual do cofre está incorreta." }, 403);
      }
      const hashed = await hashPassword(String(newPassword));
      const { error: updateError } = await admin
        .from("profiles")
        .update({ vault_password: hashed })
        .eq("id", user.id);
      if (updateError) return json({ error: updateError.message }, 400);
      return json({ success: true });
    }

    if (action === "reset-with-login") {
      // Strong recovery: user proves they still own the Supabase account by
      // supplying their current login password. No email token needed, and
      // no state ever gets written to a client-readable column.
      if (!user.email) return json({ error: "Conta sem e-mail associado." }, 400);
      if (!loginPassword) return json({ error: "Informe sua senha de login." }, 400);
      if (!newPassword || String(newPassword).length < 4) {
        return json({ error: "A nova senha deve ter ao menos 4 caracteres." }, 400);
      }

      // Use an isolated client (no session persistence) to re-check the
      // password. This never touches or replaces the caller's active session.
      const reauthClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: signIn, error: signInError } = await reauthClient.auth.signInWithPassword({
        email: user.email,
        password: String(loginPassword),
      });
      if (signInError || !signIn?.user || signIn.user.id !== user.id) {
        return json({ error: "Senha de login incorreta." }, 403);
      }

      const hashed = await hashPassword(String(newPassword));
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          vault_password: hashed,
          vault_recovery_token: null,
          vault_recovery_expires: null,
        })
        .eq("id", user.id);
      if (updateError) return json({ error: updateError.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    console.error("vault-auth error", error);
    return json({ error: "Erro interno." }, 500);
  }
});
