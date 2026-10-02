import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SkillChip } from "@/components/shared/skill-chip";
import { ProjectCard } from "@/components/profile/project-card";
import { GithubConnectCard } from "@/components/profile/github-connect";
import { LinkedInCard } from "@/components/profile/linkedin-card";
import { AddProjectForm } from "@/components/profile/add-project-form";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { LOOKING_FOR_OPTIONS, type LookingFor, type Profile, type Project } from "@/types";
import { ExternalLink, FolderKanban } from "lucide-react";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (!profile.onboarding_complete) redirect("/onboarding");

  const [{ data: skillRows }, { data: projects }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("profile_skills")
        .select("skill:skills(name)")
        .eq("profile_id", user.id),
      supabase
        .from("projects")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("community_members")
        .select("community:communities(name, slug)")
        .eq("profile_id", user.id),
    ]);

  const skills =
    skillRows?.map((r) => (r.skill as unknown as { name: string })?.name).filter(Boolean) ||
    [];
  const looking = ((profile.looking_for || []) as LookingFor[])
    .map((v) => LOOKING_FOR_OPTIONS.find((o) => o.value === v)?.label || v)
    .join(" · ");

  return (
    <div className="space-y-8">
      <PageHeader title="My Profile" description="Your developer profile and proof of work.">
        <Button variant="outline" asChild>
          <Link href="/settings">Edit profile</Link>
        </Button>
        {profile.username && (
          <Button asChild>
            <Link href={`/u/${profile.username}`}>
              Public view
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
      </PageHeader>

      <ProfileCompletion profile={profile as Profile} />

      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <UserAvatar
            name={profile.full_name}
            src={profile.avatar_url}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-primary">
              Developer Profile
            </p>
            <h2 className="text-2xl font-semibold">{profile.full_name}</h2>
            <p className="text-muted-foreground">
              {profile.headline || "Developer"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {[profile.college, profile.course, profile.city]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
            {looking && (
              <p className="mt-2 text-sm text-primary">Looking for: {looking}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <SkillChip key={s} name={s} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <GithubConnectCard githubUrl={profile.github_url} />
      <LinkedInCard linkedinUrl={profile.linkedin_url} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Proof of Work</h2>
          <AddProjectForm />
        </div>
        {!projects?.length ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet."
            description="Add projects to show what you can build."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(projects as Project[]).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Communities</h2>
        <div className="flex flex-wrap gap-2">
          {(memberships || []).map((m, i) => {
            const c = m.community as unknown as { name: string; slug: string };
            if (!c) return null;
            return (
              <Link
                key={i}
                href={`/communities/${c.slug}`}
                className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm hover:border-primary/30"
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
