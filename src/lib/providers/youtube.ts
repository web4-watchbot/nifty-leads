// Free YouTube discovery via oEmbed + public web search — no API key required.
// We use the z-ai-web-dev-sdk to discover YouTube channel URLs and then enrich
// each channel via the public oEmbed endpoint.

import { searchWebMulti, type WebResult } from "./web";

export interface YouTubeChannel {
  channelName: string;
  channelUrl: string;
  channelId?: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: string; // Not available without API — left undefined
  videoCount?: string;
  rssFeed?: string;
  businessEmail?: string; // Only from channel description (publicly published)
  keywords?: string[];
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  Author_url?: string;
  author_url?: string;
  thumbnail_url?: string;
  html?: string;
}

export async function searchYouTubeChannels(query: string, maxResults = 20): Promise<YouTubeChannel[]> {
  // Use web search to find YouTube channel URLs — respects robots.txt by relying
  // on a search engine that has already chosen to index YouTube publicly.
  const ddgQuery = `site:youtube.com "${query.replace(/"/g, "")}"`;
  const rawResults = await searchWebMulti(ddgQuery, maxResults);

  // Some web-search backends return google.com/goto?url=... redirects instead of
  // the real youtube.com URL. Resolve those by extracting the embedded url= param.
  const results: WebResult[] = [];
  for (const r of rawResults) {
    const goto = r.url.match(/[?&]url=([^&]+)/i) || r.url.match(/goto\?url=([^&]+)/i);
    if (goto) {
      try {
        const real = decodeURIComponent(goto[1]);
        if (/youtube\.com\//i.test(real)) {
          results.push({ ...r, url: real });
          continue;
        }
      } catch {
        // ignore decode errors
      }
    }
    // Also extract a youtube.com URL from the snippet if the title clearly references one
    if (!r.url.includes("youtube.com/") && /youtube\.com\/(channel|user|c|@|watch)/i.test(r.snippet)) {
      const m = r.snippet.match(/https?:\/\/(?:www\.)?youtube\.com\/(?:channel|user|c\/|@|watch\?v=)[\w.-]+/i);
      if (m) {
        results.push({ ...r, url: m[0] });
        continue;
      }
    }
    results.push(r);
  }

  const channels: YouTubeChannel[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    // Filter to actual YouTube URLs only
    if (!/youtube\.com\//i.test(r.url)) continue;
    // Skip individual video pages — we want channel/handle URLs
    if (/youtube\.com\/watch/i.test(r.url)) continue;
    const channel = await resolveChannel(r);
    if (channel && !seen.has(channel.channelUrl)) {
      seen.add(channel.channelUrl);
      channels.push(channel);
    }
    if (channels.length >= maxResults) break;
  }
  return channels;
}

async function resolveChannel(result: WebResult): Promise<YouTubeChannel | null> {
  // Normalize various YouTube URL forms
  const url = result.url;
  let channelUrl = url;
  let channelId: string | undefined;
  let rssFeed: string | undefined;

  const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  const userMatch = url.match(/youtube\.com\/user\/([\w.-]+)/);
  const cMatch = url.match(/youtube\.com\/c\/([\w.-]+)/);
  const handleMatch = url.match(/youtube\.com\/@([\w.-]+)/);

  if (channelMatch) {
    channelId = channelMatch[1];
    rssFeed = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  } else if (userMatch) {
    rssFeed = `https://www.youtube.com/feeds/videos.xml?username=${userMatch[1]}`;
  } else if (cMatch || handleMatch) {
    // Need to fetch the page to resolve channel ID
    try {
      const pageRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NiftyLeadFinder/1.0)" },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const idMatch = html.match(/"channelId":"(UC[\w-]+)"/);
        if (idMatch) {
          channelId = idMatch[1];
          rssFeed = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          channelUrl = `https://www.youtube.com/channel/${channelId}`;
        }
      }
    } catch {
      // ignore — keep original URL
    }
  }

  // Try oEmbed for clean title + thumbnail
  let title = result.title.replace(/\s*-\s*YouTube\s*$/i, "").trim();
  let thumbnail: string | undefined;
  let authorName = title;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(channelUrl)}&format=json`;
    const oembedRes = await fetch(oembedUrl, {
      headers: { "User-Agent": "NiftyLeadFinder/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (oembedRes.ok) {
      const o = (await oembedRes.json()) as OEmbedResponse;
      title = o.title;
      authorName = o.author_name || o.Author_url || authorName;
      thumbnail = o.thumbnail_url || o.thumbnail_url;
    }
  } catch {
    // ignore
  }

  // Extract business email from snippet (only publicly published in description)
  const emailMatch = result.snippet.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const businessEmail = emailMatch ? emailMatch[0] : undefined;

  // Extract keywords from title
  const keywords = title.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);

  return {
    channelName: authorName || title,
    channelUrl,
    channelId,
    description: result.snippet || undefined,
    thumbnail,
    rssFeed,
    businessEmail,
    keywords,
  };
}
