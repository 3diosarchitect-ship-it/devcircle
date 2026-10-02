import type { SupabaseClient } from "@supabase/supabase-js";

export type JobNotifyInput = {
  communityId: string;
  communityName: string;
  communitySlug: string;
  title: string;
  body?: string;
  /** Exclude author / bot from recipients */
  excludeProfileIds?: string[];
  link?: string;
};

/**
 * Notify every member of a community (except excluded ids).
 * Used when a job / opportunity is posted into a joined community.
 */
export async function notifyCommunityMembers(
  supabase: SupabaseClient,
  input: JobNotifyInput
): Promise<number> {
  const { data: members, error } = await supabase
    .from("community_members")
    .select("profile_id")
    .eq("community_id", input.communityId);

  if (error || !members?.length) return 0;

  const exclude = new Set(input.excludeProfileIds || []);
  const recipients = members
    .map((m) => m.profile_id)
    .filter((id) => id && !exclude.has(id));

  if (!recipients.length) return 0;

  const link =
    input.link || `/communities/${input.communitySlug}`;

  const rows = recipients.map((profile_id) => ({
    profile_id,
    title: input.title,
    body: input.body || `Posted in ${input.communityName}`,
    link,
    read: false,
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error: insertErr } = await supabase
      .from("notifications")
      .insert(chunk);
    if (!insertErr) inserted += chunk.length;
  }
  return inserted;
}

/**
 * After a batch of job posts, send one digest notification per community
 * to each member (avoids flooding on 30‑min bot runs).
 */
export async function notifyJobDigests(
  supabase: SupabaseClient,
  digests: Array<{
    communityId: string;
    communityName: string;
    communitySlug: string;
    count: number;
    latestTitle: string;
  }>,
  excludeProfileIds: string[] = []
): Promise<number> {
  let total = 0;
  for (const d of digests) {
    if (d.count <= 0) continue;
    const n = await notifyCommunityMembers(supabase, {
      communityId: d.communityId,
      communityName: d.communityName,
      communitySlug: d.communitySlug,
      title:
        d.count === 1
          ? `New job in ${d.communityName}`
          : `${d.count} new jobs in ${d.communityName}`,
      body:
        d.count === 1
          ? d.latestTitle
          : `Latest: ${d.latestTitle}`,
      excludeProfileIds,
      link: `/communities/${d.communitySlug}`,
    });
    total += n;
  }
  return total;
}
