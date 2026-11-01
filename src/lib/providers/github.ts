// Free GitHub public search — uses GitHub's unauthenticated public API
// (rate-limited to 10 req/min). Great for finding developer profiles,
// open-source maintainers, and tech company orgs.

export interface GitHubUser {
  login: string;
  name?: string;
  htmlUrl: string;
  avatarUrl?: string;
  bio?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  twitterUsername?: string;
  type: "User" | "Organization";
  followers?: number;
  publicRepos?: number;
}

export async function searchGithubUsers(query: string, maxResults = 20): Promise<GitHubUser[]> {
  // Try to extract a location qualifier from the query
  const q = buildGithubQuery(query);
  const url = `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=${Math.min(maxResults, 30)}&sort=joined&order=desc`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "NiftyLeadFinder/1.0",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error("GitHub rate limit reached (10 req/min unauthenticated). Try again shortly.");
    throw new Error(`GitHub returned ${res.status}`);
  }
  const data = (await res.json()) as { items: Array<{ login: string; html_url: string; avatar_url: string; type: string }> };
  const users: GitHubUser[] = [];
  for (const item of data.items || []) {
    // Fetch detailed profile (also rate-limited but usually fine for low volumes)
    try {
      const detailRes = await fetch(`https://api.github.com/users/${item.login}`, {
        headers: { "Accept": "application/vnd.github+json", "User-Agent": "NiftyLeadFinder/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!detailRes.ok) {
        users.push({
          login: item.login,
          htmlUrl: item.html_url,
          avatarUrl: item.avatar_url,
          type: item.type === "Organization" ? "Organization" : "User",
        });
        continue;
      }
      const d = (await detailRes.json()) as Record<string, unknown>;
      users.push({
        login: item.login,
        name: (d.name as string) || undefined,
        htmlUrl: item.html_url,
        avatarUrl: item.avatar_url,
        bio: (d.bio as string) || undefined,
        company: (d.company as string) || undefined,
        blog: normalizeBlog(d.blog as string | undefined),
        location: (d.location as string) || undefined,
        email: (d.email as string) || undefined,
        twitterUsername: (d.twitter_username as string) || undefined,
        type: item.type === "Organization" ? "Organization" : "User",
        followers: d.followers as number | undefined,
        publicRepos: d.public_repos as number | undefined,
      });
    } catch {
      users.push({
        login: item.login,
        htmlUrl: item.html_url,
        avatarUrl: item.avatar_url,
        type: item.type === "Organization" ? "Organization" : "User",
      });
    }
    if (users.length >= maxResults) break;
  }
  return users;
}

function normalizeBlog(blog?: string): string | undefined {
  if (!blog) return undefined;
  if (!/^https?:\/\//i.test(blog)) return `https://${blog}`;
  return blog;
}

function buildGithubQuery(raw: string): string {
  // Convert plain-English queries into GitHub user search qualifiers.
  // Examples:
  //   "react developers in berlin"      -> "react location:berlin type:user"
  //   "open source companies germany"   -> "type:org location:germany"
  //   "freelance python developer india" -> "python location:india type:user"
  const q = raw.toLowerCase();
  let type: "user" | "org" | null = null;
  let location: string | null = null;
  const keywords: string[] = [];

  if (/\b(org|organization|company|companies|startup|startups|agency|agencies)\b/.test(q)) {
    type = "org";
  } else if (/\b(developer|dev|engineer|programmer|freelancer|individual|maintainer|person)\b/.test(q)) {
    type = "user";
  }

  // Extract "in <location>"
  const inMatch = raw.match(/\bin\s+([a-z\s,]+)$/i);
  if (inMatch) location = inMatch[1].trim();
  else {
    const locMatch = raw.match(/\b(?:from|located in|based in|near)\s+([a-z\s,]+)$/i);
    if (locMatch) location = locMatch[1].trim();
  }

  // Strip stopwords to get core tech keywords
  const stripped = raw
    .replace(/\b(find|search|looking for|top|best|all|the|in|from|located|based|near|open|source|company|companies|org|organization|startup|startups|agency|agencies|developer|developers|dev|engineer|engineers|programmer|programmers|freelancer|freelancers|individual|maintainer|person|people)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped) keywords.push(stripped.split(/\s+/).slice(0, 3).join(" "));

  const parts: string[] = [];
  if (keywords.length) parts.push(keywords.join(" "));
  if (location) parts.push(`location:${location.replace(/\s+/g, "+")}`);
  if (type) parts.push(`type:${type}`);
  if (!parts.length) return raw; // fallback
  return parts.join(" ");
}
