// Free social/community discovery via web search — no API key required.
// Targets multiple open communities at once by issuing site: queries:
//   - X / Twitter        (site:x.com OR site:twitter.com)
//   - Reddit             (site:reddit.com/user)
//   - IndieHackers       (site:indiehackers.com)
//   - Stack Overflow     (site:stackoverflow.com/users)
//   - Mastodon           (site:mastodon.social OR site:mastodon.online)
// Returns person/community leads with username + profile URL.

import { searchWebMulti, type WebResult } from "./web";

export interface SocialPerson {
  username: string;
  platform: "twitter" | "reddit" | "indiehackers" | "stackoverflow" | "mastodon" | "other";
  profileUrl: string;
  displayName?: string;
  bio?: string;
  snippet: string;
  followersText?: string;        // e.g. "12.4K followers"
}

const PLATFORM_PATTERNS: Array<{ platform: SocialPerson["platform"]; pattern: RegExp; }> = [
  { platform: "twitter",    pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/i },
  { platform: "reddit",     pattern: /https?:\/\/(?:www\.)?reddit\.com\/(?:user|u)\/([A-Za-z0-9_-]{3,21})(?:[/?#]|$)/i },
  { platform: "indiehackers", pattern: /https?:\/\/(?:www\.)?indiehackers\.com\/([A-Za-z0-9_]{3,30})(?:[/?#]|$)/i },
  { platform: "stackoverflow", pattern: /https?:\/\/(?:www\.)?stackoverflow\.com\/users\/(\d+\/[A-Za-z0-9_-]+)(?:[/?#]|$)/i },
  { platform: "mastodon",   pattern: /https?:\/\/(?:www\.)?(mastodon\.(?:social|online|world|cloud))\/@([A-Za-z0-9_]{1,30})(?:[/?#]|$)/i },
];

const PLATFORM_LABELS: Record<SocialPerson["platform"], string> = {
  twitter: "X (Twitter)",
  reddit: "Reddit",
  indiehackers: "IndieHackers",
  stackoverflow: "Stack Overflow",
  mastodon: "Mastodon",
  other: "Social",
};

export const SOCIAL_PLATFORM_LABELS = PLATFORM_LABELS;

function detectPlatform(url: string): { platform: SocialPerson["platform"]; username: string } | null {
  for (const { platform, pattern } of PLATFORM_PATTERNS) {
    const m = url.match(pattern);
    if (m) {
      // For stackoverflow, the username is in group 2 (after the ID)
      const username = platform === "stackoverflow" ? m[1].split("/")[1] : m[platform === "mastodon" ? 2 : 1];
      return { platform, username };
    }
  }
  return null;
}

function parseFollowers(snippet: string): string | undefined {
  const m = snippet.match(/(\d+(?:\.\d+)?[KM]?)\s*(?:followers|follower)/i);
  return m ? m[1] : undefined;
}

function parseDisplayName(title: string, username: string): string | undefined {
  // X / Twitter titles: "Name (@username)" or "@username" or "Name on X"
  const nameMatch = title.match(/^([A-Z][\w .,'-]{1,40})\s+\(@/);
  if (nameMatch) return nameMatch[1].trim();
  // Reddit titles: "u/username - Reddit overview" → username only
  if (title.startsWith("u/") || title.startsWith("r/")) return undefined;
  // Generic: title up to first dash if it doesn't look like a username
  const dashIdx = title.search(/\s[-–|]\s/);
  if (dashIdx > 2 && dashIdx < 60) return title.slice(0, dashIdx).trim();
  return undefined;
}

export async function searchSocialProfiles(query: string, maxResults = 25): Promise<SocialPerson[]> {
  // Issue a single web search with multiple site: filters. Most search engines
  // (including the z-ai SDK) interpret this as OR.
  const cleaned = query.replace(/"/g, "").trim();
  const socialQuery = `(site:x.com OR site:twitter.com OR site:reddit.com/user OR site:indiehackers.com OR site:stackoverflow.com/users OR site:mastodon.social) ${cleaned}`;
  const results = await searchWebMulti(socialQuery, maxResults);

  const people: SocialPerson[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const detected = detectPlatform(r.url);
    if (!detected) continue;
    const { platform, username } = detected;
    if (seen.has(r.url)) continue;
    seen.add(r.url);

    // Skip Twitter status pages — we want profile pages, not tweets
    if (platform === "twitter" && /\/status\//i.test(r.url)) continue;
    if (platform === "reddit" && !/reddit\.com\/(user|u)\//i.test(r.url)) continue;

    people.push({
      username,
      platform,
      profileUrl: r.url,
      displayName: parseDisplayName(r.title, username),
      bio: r.snippet.length > 5 && r.snippet.length < 400 ? r.snippet : undefined,
      snippet: r.snippet,
      followersText: parseFollowers(r.snippet),
    });

    if (people.length >= maxResults) break;
  }
  return people;
}
