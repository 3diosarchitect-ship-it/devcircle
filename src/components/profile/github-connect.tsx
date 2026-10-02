"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code2, ExternalLink, GitFork, Star } from "lucide-react";
import { toast } from "sonner";
import type { GithubProfile, GithubRepo } from "@/lib/github";
import { formatRelativeTime } from "@/lib/utils";

/** Loads real public repos from GitHub API using the profile github_url. */
export function GithubConnectCard({ githubUrl }: { githubUrl?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<GithubProfile | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function importFromGithub() {
    if (!githubUrl) {
      toast.error("Add your GitHub URL in Settings first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setProfile(data.profile);
      setRepos(data.repos || []);
      setLoaded(true);
      toast.success(
        `Loaded ${data.repos?.length || 0} public repos from @${data.username}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GitHub fetch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Code2 className="size-4 text-primary" />
            <h3 className="font-medium">GitHub</h3>
          </div>
          {githubUrl ? (
            <p className="text-sm text-muted-foreground">
              Profile linked:{" "}
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {githubUrl}
              </a>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              GitHub not connected yet. Add{" "}
              <span className="text-foreground">https://github.com/username</span>{" "}
              in Settings.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Imports real public repositories from the GitHub API (not demo data).
            No skill scores invented.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!githubUrl || loading}
          onClick={importFromGithub}
        >
          {loading ? "Fetching…" : loaded ? "Refresh from GitHub" : "Import from GitHub"}
        </Button>
      </div>

      {profile && (
        <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
          <div className="font-medium">
            @{profile.login}
            {profile.name ? ` · ${profile.name}` : ""}
          </div>
          {profile.bio && (
            <p className="mt-1 text-muted-foreground">{profile.bio}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {profile.public_repos} public repos · {profile.followers} followers
          </p>
        </div>
      )}

      {loaded && repos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No public (non-fork) repositories found on this account.
        </p>
      )}

      {repos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {repos.map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-primary">{repo.name}</div>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
              {repo.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {repo.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                {repo.language && <span>{repo.language}</span>}
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3" />
                  {repo.stargazers_count}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitFork className="size-3" />
                  {repo.forks_count}
                </span>
                <span>Updated {formatRelativeTime(repo.updated_at)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
