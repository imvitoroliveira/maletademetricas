// Shared CORS helper: only allow the app's own origins (no wildcard "*").
const ALLOWED_EXACT = ["https://maletademetricas.lovable.app"];
const ALLOWED_SUFFIXES = [".lovable.app", ".lovable.dev", ".lovableproject.com"];
const FALLBACK_ORIGIN = ALLOWED_EXACT[0];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  let allow = FALLBACK_ORIGIN;
  try {
    const host = new URL(origin).hostname;
    if (ALLOWED_EXACT.includes(origin) || ALLOWED_SUFFIXES.some((s) => host.endsWith(s))) {
      allow = origin;
    }
  } catch {
    // invalid / missing origin -> keep fallback
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
