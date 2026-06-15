/**
 * Helper server-only para extrair o conteúdo de uma página de vídeo via Firecrawl.
 * Funciona melhor com links do YouTube (pega título, descrição e transcrição quando disponível);
 * Instagram/TikTok costumam expor legenda e metadados.
 */
export async function scrapeVideoContent(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "summary"],
      onlyMainContent: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha ao ler o link (${res.status}). ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: { markdown?: string; summary?: string; metadata?: { title?: string; description?: string } };
  };
  const d = json.data ?? {};
  const parts = [
    d.metadata?.title ? `Título: ${d.metadata.title}` : "",
    d.metadata?.description ? `Descrição: ${d.metadata.description}` : "",
    d.summary ? `Resumo: ${d.summary}` : "",
    d.markdown ? `Conteúdo:\n${d.markdown}` : "",
  ].filter(Boolean);

  const content = parts.join("\n\n").trim();
  if (!content) throw new Error("Não consegui extrair conteúdo desse link.");
  // Limita o tamanho enviado ao modelo.
  return content.slice(0, 8000);
}
