export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics?: string[];
};

export type GithubProfile = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
};

/** Extract github.com/{username} from a profile URL. */
export function parseGithubUsername(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      return null;
    }
    const part = u.pathname.split("/").filter(Boolean)[0];
    if (!part || part.startsWith("@")) return null;
    // ignore non-user paths
    if (["orgs", "settings", "marketplace", "explore", "topics"].includes(part)) {
      return null;
    }
    return part;
  } catch {
    return null;
  }
}

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DevCircle-MVP",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional: raises rate limit for team testing (Settings → Developer settings → PAT)
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export async function fetchGithubProfile(
  username: string
): Promise<GithubProfile | null> {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: githubHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    login: data.login,
    name: data.name,
    avatar_url: data.avatar_url,
    bio: data.bio,
    html_url: data.html_url,
    public_repos: data.public_repos,
    followers: data.followers,
  };
}

/** Real public repos from GitHub API — no fake scores. */
export async function fetchGithubRepos(
  username: string,
  limit = 8
): Promise<GithubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=${limit}&type=owner`,
    {
      headers: githubHeaders(),
      next: { revalidate: 300 },
    }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? "GitHub rate limit hit. Add GITHUB_TOKEN to .env.local for team testing."
        : res.status === 404
          ? "GitHub user not found. Check the profile URL."
          : `GitHub API error (${res.status})`
    );
  }
  const data = (await res.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    fork: boolean;
    topics?: string[];
  }>;

  return data
    .filter((r) => !r.fork)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      updated_at: r.updated_at,
      topics: r.topics,
    }));
}
