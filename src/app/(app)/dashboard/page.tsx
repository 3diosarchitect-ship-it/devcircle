import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateMatchScore } from "@/lib/matching";
import { greeting, formatRelativeTime, applyLinkLabel, isLinkedInUrl } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { OpportunityListWithSave } from "@/components/opportunities/opportunity-list-with-save";
import { MemberCard } from "@/components/communities/member-card";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Briefcase, ExternalLink, UsersRound } from "lucide-react";
import type { LookingFor, Opportunity, Profile, PostType } from "@/types";
import { POST_TYPE_LABELS } from "@/types";
import { UserAvatar } from "@/components/shared/user-avatar";

export default async function DashboardPage() {
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

  const { data: skillRows } = await supabase
    .from("profile_skills")
    .select("skill:skills(name)")
    .eq("profile_id", user.id);

  const skillNames =
    skillRows?.map((r) => (r.skill as unknown as { name: string })?.name).filter(Boolean) ||
    [];

  const [{ data: realOpps }, { data: saved }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("is_demo", false)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("profile_id", user.id),
      supabase
        .from("community_members")
        .select("community:communities(id, name, slug, member_count)")
        .eq("profile_id", user.id),
    ]);

  let opportunities = realOpps;
  if (!opportunities?.length) {
    const { data: demoOpps } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    opportunities = demoOpps;
  }

  const savedIds = new Set((saved || []).map((s) => s.opportunity_id));

  const matched = (opportunities || [])
    .map((opp) => {
      const result = calculateMatchScore(
        {
          skills: skillNames,
          looking_for: (profile.looking_for || []) as LookingFor[],
          city: profile.city,
        },
        opp as Opportunity
      );
      return { opp: opp as Opportunity, ...result };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const communities = (memberships || [])
    .map((m) => m.community as unknown as { id: string; name: string; slug: string; member_count: number })
    .filter(Boolean);

  const communityIds = communities.map((c) => c.id);
  const communityById = new Map(communities.map((c) => [c.id, c]));

  const { data: recentPosts } = communityIds.length
    ? await supabase
        .from("posts")
        .select(
          "id, content, type, link_url, created_at, community_id, author:profiles!posts_author_id_fkey(username, full_name, avatar_url)"
        )
        .in("community_id", communityIds)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] as never[] };

  // People like you — overlapping skills
  const { data: sameSkillProfiles } = skillNames.length
    ? await supabase
        .from("profile_skills")
        .select("profile_id, skill:skills(name)")
        .neq("profile_id", user.id)
        .limit(200)
    : { data: [] as { profile_id: string }[] };

  const overlapCount = new Map<string, number>();
  for (const row of sameSkillProfiles || []) {
    const skillName = (row as { skill?: { name?: string } }).skill?.name;
    if (skillName && skillNames.includes(skillName)) {
      overlapCount.set(
        row.profile_id,
        (overlapCount.get(row.profile_id) || 0) + 1
      );
    }
  }

  const topPeopleIds = [...overlapCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let people: (Profile & { skillNames: string[] })[] = [];
  if (topPeopleIds.length) {
    const { data: peopleProfiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", topPeopleIds)
      .eq("onboarding_complete", true);

    const { data: peopleSkills } = await supabase
      .from("profile_skills")
      .select("profile_id, skill:skills(name)")
      .in("profile_id", topPeopleIds);

    people = (peopleProfiles || []).map((p) => ({
      ...(p as Profile),
      skillNames:
        peopleSkills
          ?.filter((s) => s.profile_id === p.id)
          .map((s) => (s.skill as unknown as { name: string })?.name)
          .filter(Boolean) || [],
    }));
  }

  const firstName = profile.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span suppressHydrationWarning>
            {`${greeting()}, ${firstName} 👋`}
          </span>
        }
        description="Your communities, matched opportunities, and people building similar things."
      />

      <ProfileCompletion profile={profile as Profile} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Opportunities for you</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/opportunities">View all</Link>
          </Button>
        </div>
        {matched.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No opportunities yet"
            description="The jobs bot will fill this after the first hourly run (or npm run ingest-jobs)."
            actionLabel="Explore Opportunities"
            actionHref="/opportunities"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <OpportunityListWithSave
              items={matched.map(({ opp, score, reasons }) => ({
                opportunity: opp,
                matchScore: score,
                matchReasons: reasons,
              }))}
              savedIds={[...savedIds]}
            />
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Communities</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/communities">Explore</Link>
          </Button>
        </div>
        {communities.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No communities yet"
            description="Complete onboarding with skills to join automatically."
            actionLabel="Explore Communities"
            actionHref="/communities"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.slug}`}
                className="glass-card block px-4 py-4 transition hover:border-primary/30"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.member_count} members
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">From your communities</h2>
        </div>
        {!recentPosts?.length ? (
          <EmptyState
            title="No messages yet"
            description="Open a community you joined and post a question or project update."
            actionLabel="Open Communities"
            actionHref="/communities"
          />
        ) : (
          <div className="space-y-3">
            {recentPosts.map((p) => {
              const author = p.author as {
                username: string | null;
                full_name: string | null;
                avatar_url: string | null;
              } | null;
              const community = communityById.get(p.community_id);
              const linkUrl = (p as { link_url?: string | null }).link_url?.trim() || null;
              return (
                <div
                  key={p.id}
                  className="glass-card p-4 transition hover:border-primary/30"
                >
                  <Link
                    href={community ? `/communities/${community.slug}` : "/communities"}
                    className="block"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        name={author?.full_name}
                        src={author?.avatar_url}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">
                            {author?.full_name || "Member"}
                          </span>
                          {community && (
                            <span className="text-xs text-primary">
                              in {community.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            · {formatRelativeTime(p.created_at)}
                          </span>
                        </div>
                        <span className="mt-1 inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          {POST_TYPE_LABELS[p.type as PostType] || p.type}
                          {isLinkedInUrl(linkUrl) ? " · LinkedIn" : ""}
                        </span>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {p.content}
                        </p>
                      </div>
                    </div>
                  </Link>
                  {linkUrl ? (
                    <div className="mt-3 pl-11">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                          {applyLinkLabel(linkUrl)}
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">People like you</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/people">Find developers</Link>
          </Button>
        </div>
        {people.length === 0 ? (
          <EmptyState
            title="No similar developers yet"
            description="As more students join with overlapping skills, they'll show up here."
            actionLabel="Browse People"
            actionHref="/people"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <MemberCard
                key={p.id}
                member={{
                  username: p.username,
                  full_name: p.full_name,
                  avatar_url: p.avatar_url,
                  college: p.college,
                  bio: p.bio,
                  github_url: p.github_url,
                  looking_for: p.looking_for,
                  skills: p.skillNames,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
