import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hashPassword, verifyPassword } from "../_shared/crypto.ts";

// Vault master-password management. The hash NEVER leaves the server.
// Actions (all scoped to the authenticated caller's own profile):
//   - "status": { configured }
//   - "verify": { valid, configured }
//   - "set":    { success }  (validates currentPassword if one already exists)
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
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { action, password, currentPassword, newPassword } = await req.json();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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
        const ok = await verifyPassword(String(currentPassword ?? ""), profile.vault_password);
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

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
