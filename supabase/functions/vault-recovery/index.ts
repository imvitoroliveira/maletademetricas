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

    const { email, type, token, newPassword } = await req.json();

    if (type === "request") {
      // Generate a random token
      const recoveryToken = crypto.randomUUID();
      const expires = new Date(Date.now() + 3600000); // 1 hour expiration

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

      // In a real scenario, we would send an email here. 
      // For this implementation, we'll return a success message 
      // and the frontend will simulate the email flow or use the token if in dev.
      return new Response(
        JSON.stringify({ 
          message: "Token de recuperação gerado com sucesso.",
          token: recoveryToken // In production, this would only be sent via email
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

      if (profile.vault_recovery_token !== token || now > expires) {
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