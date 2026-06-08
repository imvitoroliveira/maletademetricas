import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { email, type, token, newPassword } = body;

    if (type === "request") {
      const recoveryToken = crypto.randomUUID().substring(0, 8).toUpperCase();
      const expires = new Date(Date.now() + 3600000);

      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .update({ 
          vault_recovery_token: recoveryToken,
          vault_recovery_expires: expires.toISOString()
        })
        .eq("email", email)
        .select()
        .single();

      if (profileError || !profile) {
        throw new Error("Usuário não encontrado.");
      }

      return new Response(
        JSON.stringify({ 
          message: "Token de recuperação gerado com sucesso.",
          token: recoveryToken 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "reset") {
      const { data: profile, error: fetchError } = await supabaseClient
        .from("profiles")
        .select("id, vault_recovery_token, vault_recovery_expires")
        .eq("email", email)
        .single();

      if (fetchError || !profile) {
        throw new Error("Solicitação inválida.");
      }

      const now = new Date();
      const expires = new Date(profile.vault_recovery_expires);

      if (!profile.vault_recovery_token || profile.vault_recovery_token !== token || now > expires) {
        throw new Error("Token inválido ou expirado.");
      }

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          vault_password: newPassword,
          vault_recovery_token: null,
          vault_recovery_expires: null
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ message: "Senha do cofre redefinida com sucesso!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida.");
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});