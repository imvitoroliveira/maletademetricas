import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ============================================================================
// ai-chat: Chat de I.A. com ROTAÇÃO de chaves de API.
// Tenta cada chave ativa (Claude/OpenAI/Gemini) por ordem de prioridade.
// Se todas falharem (rate limit / erro), usa o Lovable AI Gateway como fallback.
// As chaves NUNCA são enviadas ao cliente — só são lidas aqui via service role.
// ============================================================================

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type ProviderKey = {
  id: string;
  label: string;
  provider: "anthropic" | "openai" | "google";
  api_key: string;
  model: string;
};

// --- Provider callers -------------------------------------------------------

async function callOpenAICompatible(
  url: string,
  headers: Record<string, string>,
  model: string,
  system: string,
  messages: ChatMessage[],
): Promise<string> {
  const payload = {
    model,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Resposta vazia do provedor.");
  return text;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      ...(system ? { system } : {}),
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Resposta vazia do Claude.");
  return text;
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta vazia do Gemini.");
  return text;
}

async function callKey(
  key: ProviderKey,
  system: string,
  messages: ChatMessage[],
): Promise<string> {
  switch (key.provider) {
    case "anthropic":
      return callAnthropic(key.api_key, key.model, system, messages);
    case "openai":
      return callOpenAICompatible(
        "https://api.openai.com/v1/chat/completions",
        { Authorization: `Bearer ${key.api_key}` },
        key.model,
        system,
        messages,
      );
    case "google":
      return callGemini(key.api_key, key.model, system, messages);
    default:
      throw new Error(`Provedor desconhecido: ${key.provider}`);
  }
}

// --- Handler ----------------------------------------------------------------

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    // Authenticate the caller.
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { messages, system } = await req.json() as {
      messages: ChatMessage[];
      system?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "Mensagens são obrigatórias." }, 400);
    }

    const systemPrompt = system ??
      "Você é um assistente de I.A. especializado em marketing, tráfego pago e gestão de campanhas. Responda de forma clara, objetiva e em português do Brasil. Use markdown quando ajudar na organização.";

    // Load active rotation keys (service role: keys never reach the client).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: keys } = await admin
      .from("ai_provider_keys")
      .select("id, label, provider, api_key, model")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    const errors: string[] = [];

    // 1) Try each custom key, in order, until one succeeds (rotation).
    for (const key of (keys ?? []) as ProviderKey[]) {
      try {
        const text = await callKey(key, systemPrompt, messages);
        return json({ text, model: key.model, source: key.label });
      } catch (err) {
        errors.push(`${key.label}: ${(err as Error).message}`);
      }
    }

    // 2) Fallback to Lovable AI Gateway.
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        const text = await callOpenAICompatible(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          { "Lovable-API-Key": lovableKey },
          "google/gemini-3-flash-preview",
          systemPrompt,
          messages,
        );
        return json({ text, model: "google/gemini-3-flash-preview", source: "Lovable AI" });
      } catch (err) {
        errors.push(`Lovable AI: ${(err as Error).message}`);
      }
    }

    return json(
      { error: "Nenhum provedor de I.A. respondeu.", details: errors },
      502,
    );
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
