import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Provider helper que conecta o AI SDK ao Lovable AI Gateway.
 * Deve ser usado apenas no servidor (a chave nunca vai para o cliente).
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
    },
  });
}
