import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Vault master-password server functions. Migrated from the legacy
// supabase/functions/vault-auth + vault-recovery edge functions so the whole
// stack shares a single auth / CORS / env model (TanStack createServerFn).

async function loadCrypto() {
  return await import("./vault-crypto.server");
}

export const vaultStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("vault_password")
      .eq("id", context.userId)
      .single();
    if (error || !profile) throw new Error("Perfil não encontrado.");
    return { configured: !!profile.vault_password };
  });

export const vaultVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ password: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword, verifyPassword } = await loadCrypto();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("vault_password")
      .eq("id", context.userId)
      .single();
    if (error || !profile) throw new Error("Perfil não encontrado.");
    if (!profile.vault_password) return { valid: false, configured: false };

    const stored = String(profile.vault_password);
    const supplied = String(data.password).trim();
    const isHashed = stored.startsWith("pbkdf2$");
    let valid: boolean;
    if (isHashed) {
      valid = await verifyPassword(supplied, stored);
      console.log("[vaultVerify] hashed", { userId: context.userId, suppliedLen: supplied.length, storedLen: stored.length, valid });
    } else {
      valid = supplied === stored;
      console.log("[vaultVerify] plain", { userId: context.userId, valid });
      if (valid) {
        const upgraded = await hashPassword(supplied);
        await supabaseAdmin.from("profiles").update({ vault_password: upgraded }).eq("id", context.userId);
      }
    }
    return { valid, configured: true };
  });

export const vaultSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      currentPassword: z.string().optional().default(""),
      newPassword: z.string().min(4, "A nova senha deve ter ao menos 4 caracteres."),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword, verifyPassword } = await loadCrypto();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("vault_password")
      .eq("id", context.userId)
      .single();
    if (error || !profile) throw new Error("Perfil não encontrado.");

    if (profile.vault_password) {
      const stored = String(profile.vault_password);
      const supplied = String(data.currentPassword ?? "");
      const ok = stored.startsWith("pbkdf2$")
        ? await verifyPassword(supplied, stored)
        : supplied === stored;
      if (!ok) throw new Error("A senha atual do cofre está incorreta.");
    }

    const hashed = await hashPassword(data.newPassword);
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ vault_password: hashed })
      .eq("id", context.userId);
    if (updateError) throw new Error(updateError.message);
    return { success: true };
  });

export const vaultResetWithLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      loginPassword: z.string().min(1, "Informe sua senha de login."),
      newPassword: z.string().min(4, "A nova senha deve ter ao menos 4 caracteres."),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    if (!email) throw new Error("Conta sem e-mail associado.");

    const SUPABASE_URL = process.env.EXT_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const ANON_KEY = process.env.EXT_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

    const reauthClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: signIn, error: signInError } = await reauthClient.auth.signInWithPassword({
      email,
      password: data.loginPassword,
    });
    if (signInError || !signIn?.user || signIn.user.id !== context.userId) {
      throw new Error("Senha de login incorreta.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword } = await loadCrypto();
    const hashed = await hashPassword(data.newPassword);
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        vault_password: hashed,
        vault_recovery_token: null,
        vault_recovery_expires: null,
      })
      .eq("id", context.userId);
    if (updateError) throw new Error(updateError.message);
    return { success: true };
  });

async function sendRecoveryEmail(to: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VAULT_RECOVERY_FROM ?? "Cofre <onboarding@resend.dev>";
  if (!apiKey) return false;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:auto;padding:24px;">
      <h2 style="color:#a21caf;margin:0 0 12px;">Recuperação da senha do cofre</h2>
      <p>Você solicitou a troca da senha mestre do cofre de contingência.</p>
      <p>Use o token abaixo. Ele expira em 1 hora e só pode ser usado uma vez:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#faf5ff;padding:16px 20px;border-radius:8px;text-align:center;color:#701a75;">${token}</p>
      <p style="color:#64748b;font-size:13px;">Se você não solicitou esta recuperação, ignore este e-mail.</p>
    </div>`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [to], subject: "Token de recuperação do cofre", html }),
    });
    if (!resp.ok) { console.error("Resend failed", resp.status); return false; }
    return true;
  } catch (err) {
    console.error("Resend exception", err);
    return false;
  }
}

export const vaultRecoveryRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email;
    const genericOk = { message: "Se a conta existir, um token de recuperação foi enviado para o e-mail cadastrado." };
    if (!email) return genericOk;

    const plainToken = crypto.randomUUID().slice(0, 8).toUpperCase();
    const emailed = await sendRecoveryEmail(email, plainToken);
    if (!emailed) return genericOk;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword } = await loadCrypto();
    const tokenHash = await hashPassword(plainToken);
    const expires = new Date(Date.now() + 3600_000);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ vault_recovery_token: tokenHash, vault_recovery_expires: expires.toISOString() })
      .eq("id", context.userId);
    if (error) console.error("vault-recovery persist error", error);
    return genericOk;
  });

export const vaultRecoveryReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      token: z.string().min(1, "Token obrigatório."),
      newPassword: z.string().min(4, "A nova senha deve ter ao menos 4 caracteres."),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword, verifyPassword } = await loadCrypto();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, vault_recovery_token, vault_recovery_expires")
      .eq("id", context.userId)
      .single();
    if (error || !profile) throw new Error("Solicitação inválida.");

    const expires = profile.vault_recovery_expires ? new Date(profile.vault_recovery_expires) : null;
    const stillValid = !!expires && new Date() < expires;
    const tokenOk = stillValid && (await verifyPassword(data.token, profile.vault_recovery_token));
    if (!tokenOk) throw new Error("Token inválido ou expirado.");

    const hashed = await hashPassword(data.newPassword);
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ vault_password: hashed, vault_recovery_token: null, vault_recovery_expires: null })
      .eq("id", profile.id);
    if (updateError) throw new Error(updateError.message);
    return { message: "Senha do cofre redefinida com sucesso!" };
  });
