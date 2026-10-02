import { communityNameFromSkill } from "@/lib/matching";
import { slugify } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensure a community exists for a skill and return it.
 * Communities are created dynamically from the skills table.
 */
export async function ensureCommunityForSkill(
  supabase: SupabaseClient,
  skill: { id: string; name: string; slug: string }
) {
  const name = communityNameFromSkill(skill.name);
  const slug = slugify(name);

  const { data: existing } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("communities")
    .insert({
      name,
      slug,
      skill_id: skill.id,
      description: `A community for developers building with ${skill.name}. Share projects, ask questions, find teammates, and discover opportunities.`,
    })
    .select("*")
    .single();

  if (error) {
    // Race: another request may have created it
    const { data: again } = await supabase
      .from("communities")
      .select("*")
      .eq("slug", slug)
      .single();
    return again;
  }

  return created;
}

/**
 * Automatically join communities based on selected skills.
 * Core product loop: Skills → Automatic Communities
 */
export async function syncCommunitiesForProfile(
  supabase: SupabaseClient,
  profileId: string,
  skillIds: string[]
) {
  if (skillIds.length === 0) return [];

  const { data: skills } = await supabase
    .from("skills")
    .select("id, name, slug")
    .in("id", skillIds);

  if (!skills?.length) return [];

  const joined: { id: string; name: string; slug: string }[] = [];

  for (const skill of skills) {
    const community = await ensureCommunityForSkill(supabase, skill);
    if (!community) continue;

    const { error } = await supabase.from("community_members").upsert(
      {
        community_id: community.id,
        profile_id: profileId,
      },
      { onConflict: "community_id,profile_id" }
    );

    if (!error) {
      joined.push({
        id: community.id,
        name: community.name,
        slug: community.slug,
      });
    }
  }

  // Notifications for newly joined communities (best-effort)
  if (joined.length > 0) {
    await supabase.from("notifications").insert(
      joined.map((c) => ({
        profile_id: profileId,
        title: `You were added to ${c.name}`,
        body: "Based on your skills, you automatically joined this community.",
        link: `/communities/${c.slug}`,
      }))
    );
  }

  return joined;
}

/**
 * Post a team request into matching skill communities.
 */
export async function postTeamRequestToCommunities(
  supabase: SupabaseClient,
  params: {
    authorId: string;
    title: string;
    description: string;
    skills: string[];
  }
) {
  const { data: teamRequest, error } = await supabase
    .from("team_requests")
    .insert({
      author_id: params.authorId,
      title: params.title,
      description: params.description,
      looking_for_skills: params.skills,
    })
    .select("*")
    .single();

  if (error || !teamRequest) throw error || new Error("Failed to create request");

  // Find matching communities by skill name
  const { data: skillRows } = await supabase
    .from("skills")
    .select("id, name, slug")
    .in("name", params.skills);

  const content = `Looking for teammates: **${params.title}**\n\n${params.description}\n\nSkills needed: ${params.skills.join(", ")}`;

  for (const skill of skillRows || []) {
    const community = await ensureCommunityForSkill(supabase, skill);
    if (!community) continue;

    await supabase.from("posts").insert({
      author_id: params.authorId,
      community_id: community.id,
      type: "looking_for_teammate",
      content,
    });
  }

  return teamRequest;
}
