/**
 * Streams image partials from a server route that proxies the Lovable AI
 * Gateway `/v1/images/generations` SSE response.
 *
 * The callback fires for every partial (blurred previews) and once more with
 * `final=true` when the last frame arrives.
 */
export async function streamImage(
  url: string,
  body: Record<string, unknown>,
  onFrame: (dataUrl: string, final: boolean) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Falha na geração (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastDataUrl: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!frame.startsWith("data:")) continue;
      const payload = frame.replace(/^data:\s?/gm, "").trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const choice = json?.choices?.[0];
        // OpenAI-style: choices[0].delta.images[0].image_url.url
        const delta = choice?.delta ?? choice?.message ?? {};
        const image =
          delta?.images?.[0]?.image_url?.url ??
          delta?.image?.url ??
          json?.data?.[0]?.b64_json;
        if (typeof image === "string" && image.length > 0) {
          const dataUrl = image.startsWith("data:")
            ? image
            : `data:image/png;base64,${image}`;
          lastDataUrl = dataUrl;
          onFrame(dataUrl, false);
        }
      } catch {
        // ignore malformed frame
      }
    }
  }

  if (lastDataUrl) onFrame(lastDataUrl, true);
}
