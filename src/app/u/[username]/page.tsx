import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SkillChip } from "@/components/shared/skill-chip";
import { ProjectCard } from "@/components/profile/project-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  LOOKING_FOR_OPTIONS,
  type LookingFor,
  type Project,
} from "@/types";
import { CircleDot, ExternalLink, FolderGit2, FolderKanban, Link2, Star } from "lucide-react";
import {
  fetchGithubRepos,
  parseGithubUsername,
} from "@/lib/github";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("onboarding_complete", true)
    .maybeSingle();

  if (!profile) notFound();

  const [{ data: skillRows }, { data: projects }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("profile_skills")
        .select("skill:skills(name)")
        .eq("profile_id", profile.id),
      supabase
        .from("projects")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("community_members")
        .select("community:communities(name, slug)")
        .eq("profile_id", profile.id),
    ]);

  const ghUsername = parseGithubUsername(profile.github_url);
  let githubRepos: Awaited<ReturnType<typeof fetchGithubRepos>> = [];
  if (ghUsername) {
    try {
      githubRepos = await fetchGithubRepos(ghUsername, 6);
    } catch {
      githubRepos = [];
    }
  }

  const skills =
    skillRows?.map((r) => (r.skill as unknown as { name: string })?.name).filter(Boolean) ||
    [];
  const looking = ((profile.looking_for || []) as LookingFor[])
    .map((v) => LOOKING_FOR_OPTIONS.find((o) => o.value === v)?.label || v);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CircleDot className="size-4" />
          </div>
          <span className="font-semibold">DevCircle</span>
        </Link>
        <Button size="sm" asChild>
          <Link href="/register">Join as a Developer</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
        <section className="glass-card p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Developer Profile
          </p>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
            <UserAvatar
              name={profile.full_name}
              src={profile.avatar_url}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight">
                {profile.full_name}
              </h1>
              <p className="mt-1 text-lg text-muted-foreground">
                {profile.headline || "Developer"}
              </p>
              {profile.bio && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                {[profile.college, profile.course, profile.city, profile.graduation_year]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <SkillChip key={s} name={s} />
                ))}
              </div>

              {looking.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground">Looking for</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {looking.map((l) => (
                      <SkillChip key={l} name={l} size="sm" />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                {profile.github_url ? (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <FolderGit2 className="size-4" />
                    GitHub
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    GitHub not connected yet.
                  </span>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Link2 className="size-4" />
                    LinkedIn
                  </a>
                )}
                {profile.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="size-4" />
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Proof of Work</h2>
          {!projects?.length ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet."
              description="This developer hasn't added projects."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(projects as Project[]).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>

        {ghUsername && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">GitHub repositories</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Live public repos from GitHub API for @{ghUsername}
              {githubRepos.length === 0
                ? " — none loaded (private account, rate limit, or no public repos)."
                : "."}
            </p>
            {githubRepos.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {githubRepos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-card block p-4 transition hover:border-primary/30"
                  >
                    <div className="font-medium text-primary">{repo.name}</div>
                    {repo.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3" />
                        {repo.stargazers_count}
                      </span>
                      <span>Updated {formatRelativeTime(repo.updated_at)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Communities</h2>
          <div className="flex flex-wrap gap-2">
            {(memberships || []).map((m, i) => {
              const c = m.community as unknown as { name: string; slug: string };
              if (!c) return null;
              return (
                <span
                  key={i}
                  className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm"
                >
                  {c.name}
                </span>
              );
            })}
          </div>
        </section>

        {/* FUTURE: recruiter functionality — contact / shortlist student */}
      </main>
    </div>
  );
}
