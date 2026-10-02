import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { MemberCard } from "@/components/communities/member-card";
import { PostFeedList } from "@/components/communities/post-feed-list";
import type { PostCardData } from "@/components/communities/post-card";
import { CreatePostForm } from "@/components/communities/create-post-form";
import { JoinCommunityButton } from "@/components/communities/join-button";
import { OpportunityListWithSave } from "@/components/opportunities/opportunity-list-with-save";
import { SkillChip } from "@/components/shared/skill-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { calculateMatchScore } from "@/lib/matching";
import type { LookingFor, Opportunity, PostType, Profile } from "@/types";

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: community } = await supabase
    .from("communities")
    .select("*, skill:skills(name)")
    .eq("slug", slug)
    .maybeSingle();

  if (!community) notFound();

  const skillName = (community.skill as { name?: string } | null)?.name;

  const [
    { data: members },
    { data: posts },
    { data: membership },
    { data: profile },
    { data: likes },
  ] = await Promise.all([
    supabase
      .from("community_members")
      .select("profile:profiles!community_members_profile_id_fkey(*)")
      .eq("community_id", community.id)
      .limit(24),
    supabase
      .from("posts")
      .select("*, author:profiles!posts_author_id_fkey(username, full_name, avatar_url)")
      .eq("community_id", community.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("community_members")
      .select("profile_id")
      .eq("community_id", community.id)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("post_likes").select("post_id").eq("profile_id", user.id),
  ]);

  const likedIds = new Set((likes || []).map((l) => l.post_id));

  const memberProfiles = (members || [])
    .map((m) => m.profile as unknown as Profile)
    .filter(Boolean);

  const memberIds = memberProfiles.map((p) => p.id);
  const { data: memberSkills } = memberIds.length
    ? await supabase
        .from("profile_skills")
        .select("profile_id, skill:skills(name)")
        .in("profile_id", memberIds)
    : { data: [] as { profile_id: string; skill: { name: string } }[] };

  const skillsByProfile = new Map<string, string[]>();
  for (const row of memberSkills || []) {
    const name = (row.skill as unknown as { name: string })?.name;
    if (!name) continue;
    const arr = skillsByProfile.get(row.profile_id) || [];
    arr.push(name);
    skillsByProfile.set(row.profile_id, arr);
  }

  // Recent opportunities related to community skill
  let relatedOpps: Opportunity[] = [];
  if (skillName) {
    const { data: opps } = await supabase
      .from("opportunities")
      .select("*")
      .eq("is_demo", false)
      .contains("skills", [skillName])
      .order("created_at", { ascending: false })
      .limit(3);
    relatedOpps = (opps || []) as Opportunity[];
    if (!relatedOpps.length) {
      const { data: demoOpps } = await supabase
        .from("opportunities")
        .select("*")
        .contains("skills", [skillName])
        .order("created_at", { ascending: false })
        .limit(3);
      relatedOpps = (demoOpps || []) as Opportunity[];
    }
  }

  const { data: mySkills } = await supabase
    .from("profile_skills")
    .select("skill:skills(name)")
    .eq("profile_id", user.id);
  const skillNames =
    mySkills?.map((r) => (r.skill as unknown as { name: string })?.name).filter(Boolean) ||
    [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={community.name}
        description={community.description || undefined}
      >
        <JoinCommunityButton
          communityId={community.id}
          communityName={community.name}
          initiallyJoined={!!membership}
        />
      </PageHeader>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{community.member_count} members</span>
        {skillName && (
          <span className="inline-flex items-center gap-2">
            Skills: <SkillChip name={skillName} size="sm" />
          </span>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Feed</h2>
          {membership ? (
            <CreatePostForm communityId={community.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Join this community to post.
            </p>
          )}
          {!posts?.length ? (
            <EmptyState
              title="No posts yet"
              description="Be the first to ask a question or share a project."
            />
          ) : (
            <PostFeedList
              posts={(posts || []).map((p) => {
                const author = p.author as {
                  username: string | null;
                  full_name: string | null;
                  avatar_url: string | null;
                };
                const card: PostCardData = {
                  id: p.id,
                  author_id: p.author_id,
                  community_id: p.community_id,
                  type: p.type as PostType,
                  content: p.content,
                  link_url: (p as { link_url?: string | null }).link_url ?? null,
                  like_count: p.like_count,
                  comment_count: p.comment_count,
                  is_demo: p.is_demo,
                  created_at: p.created_at,
                  author: {
                    name: author.full_name ?? author.username ?? "Developer",
                    username: author.username,
                    avatar_url: author.avatar_url,
                  },
                  community: { name: community.name, slug: community.slug },
                  liked: likedIds.has(p.id),
                };
                return card;
              })}
            />
          )}
        </div>

        <aside className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Members
            </h2>
            <div className="space-y-3">
              {memberProfiles.slice(0, 8).map((p) => (
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
                    skills: skillsByProfile.get(p.id) || [],
                  }}
                />
              ))}
            </div>
          </div>

          {relatedOpps.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent opportunities
              </h2>
              <div className="space-y-3">
                <OpportunityListWithSave
                  items={relatedOpps.map((opp) => {
                    const match = calculateMatchScore(
                      {
                        skills: skillNames,
                        looking_for: (profile?.looking_for || []) as LookingFor[],
                        city: profile?.city,
                      },
                      opp
                    );
                    return {
                      opportunity: opp,
                      matchScore: match.score,
                      matchReasons: match.reasons,
                    };
                  })}
                  savedIds={[]}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
