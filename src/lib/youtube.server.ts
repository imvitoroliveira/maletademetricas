/**
 * Helper server-only para a YouTube Data API v3.
 * Resolve canais (id, @handle, URL ou nome) e busca os vídeos recentes com estatísticas.
 * A chave nunca vai para o cliente.
 */

const API = "https://www.googleapis.com/youtube/v3";

export type ResolvedChannel = {
  channelId: string;
  channelName: string;
  channelUrl: string;
};

export type YoutubeVideo = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  views: number;
  url: string;
};

function getKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY não configurada.");
  return key;
}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", getKey());
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** Extrai um identificador útil de uma URL/handle/nome do YouTube. */
function parseInput(input: string): { channelId?: string; handle?: string; query: string } {
  const raw = input.trim();
  // URL com /channel/UC...
  const channelMatch = raw.match(/channel\/(UC[\w-]{20,})/);
  if (channelMatch) return { channelId: channelMatch[1], query: raw };
  // ID puro
  if (/^UC[\w-]{20,}$/.test(raw)) return { channelId: raw, query: raw };
  // Handle @nome ou /@nome em URL
  const handleMatch = raw.match(/@([\w.\-]+)/);
  if (handleMatch) return { handle: handleMatch[1], query: handleMatch[1] };
  return { query: raw };
}

export async function resolveChannel(input: string): Promise<ResolvedChannel> {
  const parsed = parseInput(input);

  // 1. Por ID direto
  if (parsed.channelId) {
    const data = await yt<{ items?: { id: string; snippet: { title: string } }[] }>("channels", {
      part: "snippet",
      id: parsed.channelId,
    });
    const item = data.items?.[0];
    if (item) {
      return {
        channelId: item.id,
        channelName: item.snippet.title,
        channelUrl: `https://www.youtube.com/channel/${item.id}`,
      };
    }
  }

  // 2. Por handle
  if (parsed.handle) {
    const data = await yt<{ items?: { id: string; snippet: { title: string } }[] }>("channels", {
      part: "snippet",
      forHandle: parsed.handle,
    });
    const item = data.items?.[0];
    if (item) {
      return {
        channelId: item.id,
        channelName: item.snippet.title,
        channelUrl: `https://www.youtube.com/channel/${item.id}`,
      };
    }
  }

  // 3. Busca por nome
  const search = await yt<{
    items?: { id: { channelId: string }; snippet: { title: string } }[];
  }>("search", {
    part: "snippet",
    type: "channel",
    maxResults: "1",
    q: parsed.query,
  });
  const found = search.items?.[0];
  if (!found) throw new Error(`Canal não encontrado para "${input}".`);
  return {
    channelId: found.id.channelId,
    channelName: found.snippet.title,
    channelUrl: `https://www.youtube.com/channel/${found.id.channelId}`,
  };
}

/** Retorna os vídeos recentes do canal com contagem de views. */
export async function getRecentVideos(channelId: string, maxResults = 15): Promise<YoutubeVideo[]> {
  // Pega o uploads playlist do canal
  const channel = await yt<{
    items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
  }>("channels", { part: "contentDetails", id: channelId });
  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  const playlist = await yt<{
    items?: { contentDetails: { videoId: string } }[];
  }>("playlistItems", {
    part: "contentDetails",
    playlistId: uploads,
    maxResults: String(Math.min(maxResults, 50)),
  });
  const ids = (playlist.items ?? []).map((i) => i.contentDetails.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const videos = await yt<{
    items?: {
      id: string;
      snippet: { title: string; description: string; publishedAt: string };
      statistics: { viewCount?: string };
    }[];
  }>("videos", { part: "snippet,statistics", id: ids.join(",") });

  return (videos.items ?? []).map((v) => ({
    videoId: v.id,
    title: v.snippet.title,
    description: v.snippet.description ?? "",
    publishedAt: v.snippet.publishedAt,
    views: Number(v.statistics.viewCount ?? 0),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));
}

/**
 * Seleciona os vídeos "em alta": publicados nos últimos `daysWindow` dias e com
 * views acima da mediana do canal (sinal de viralização relativa).
 */
export function pickTrending(videos: YoutubeVideo[], daysWindow = 30, limit = 3): YoutubeVideo[] {
  if (videos.length === 0) return [];
  const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;
  const views = [...videos].map((v) => v.views).sort((a, b) => a - b);
  const median = views[Math.floor(views.length / 2)] || 0;
  return videos
    .filter((v) => new Date(v.publishedAt).getTime() >= cutoff)
    .filter((v) => v.views >= Math.max(median, 1))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}
