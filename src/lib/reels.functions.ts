import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReelsInput = z.object({
  topic: z.string().min(2).max(300),
  niche: z.string().max(120).optional().default(""),
  tone: z.enum(["educativo", "inspirador", "divertido", "vendas", "polemico"]).default("educativo"),
  duration: z.enum(["15s", "30s", "45s", "60s"]).default("30s"),
});

export type ReelsScript = {
  title: string;
  hook: string;
  scenes: { time: string; visual: string; speech: string }[];
  cta: string;
  caption: string;
  hashtags: string[];
};

export const generateReelsScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReelsInput.parse(input))
  .handler(async ({ data }): Promise<ReelsScript> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          title: z.string(),
          hook: z.string(),
          scenes: z.array(
            z.object({
              time: z.string(),
              visual: z.string(),
              speech: z.string(),
            }),
          ),
          cta: z.string(),
          caption: z.string(),
          hashtags: z.array(z.string()),
        }),
      }),
      prompt: `Você é um especialista em conteúdo viral para Instagram Reels.
Crie um roteiro completo de Reels em português do Brasil.

Tema: ${data.topic}
Nicho: ${data.niche || "geral"}
Tom: ${data.tone}
Duração alvo: ${data.duration}

Regras:
- O "hook" deve prender a atenção nos primeiros 3 segundos.
- Divida em cenas com marcação de tempo (ex.: "0-3s"), descrição visual e a fala/texto na tela.
- A soma das cenas deve respeitar a duração alvo.
- Inclua uma CTA forte, uma legenda pronta para postar e de 8 a 15 hashtags relevantes (sem o símbolo #).`,
    });

    return output;
  });
