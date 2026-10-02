import { createServiceClient } from "@/lib/supabase/middleware";
import {
  isFreshPortalDate,
  jobRetentionCutoffIso,
  parsePostedByDate,
  JOB_RETENTION_DAYS,
} from "@/lib/jobs/freshness";
import {
  fetchAdzunaIndiaJobs,
  fetchArbeitnowJobs,
  fetchAshbyJobs,
  fetchGreenhouseJobs,
  fetchHimalayasJobs,
  fetchHnWhoIsHiringJobs,
  fetchJobicyJobs,
  fetchLeverJobs,
  fetchRemoteOkJobs,
  fetchRemotiveIndiaJobs,
  fetchRemotiveJobs,
  fetchTheMuseJobs,
  postedByLine,
  withPostedByLine,
  type NormalizedJob,
} from "@/lib/jobs/sources";

const BOT_EMAIL = "jobs-bot@devcircle.app";
const BOT_USERNAME = "devcirclebot";

export type IngestResult = {
  fetched: number;
  inserted: number;
  posted: number;
  skipped: number;
  expired: number;
  sources: string[];
  errors: string[];
  india: number;
};

/** Delete real (non-demo) jobs older than JOB_RETENTION_DAYS + matching bot posts. */
async function purgeExpiredJobs(
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ deletedJobs: number; deletedPosts: number }> {
  const cutoff = jobRetentionCutoffIso();

  // Age out by when we saved the row
  const { data: byAge, error: selectErr } = await supabase
    .from("opportunities")
    .select("id, apply_url, description, created_at")
    .eq("is_demo", false)
    .lt("created_at", cutoff);

  if (selectErr) throw new Error(`purge select: ${selectErr.message}`);

  // Also drop recently-saved rows that still carry an old portal "Posted by … on …" date
  const { data: recent, error: recentErr } = await supabase
    .from("opportunities")
    .select("id, apply_url, description, created_at")
    .eq("is_demo", false)
    .gte("created_at", cutoff)
    .limit(500);

  if (recentErr) throw new Error(`purge recent: ${recentErr.message}`);

  const stalePortal = (recent || []).filter((r) => {
    const portal = parsePostedByDate(r.description);
    return portal != null && !isFreshPortalDate(portal);
  });

  const expiredMap = new Map<
    string,
    { id: string; apply_url: string | null }
  >();
  for (const r of [...(byAge || []), ...stalePortal]) {
    expiredMap.set(r.id, { id: r.id, apply_url: r.apply_url });
  }
  const expired = [...expiredMap.values()];
  if (!expired.length) return { deletedJobs: 0, deletedPosts: 0 };

  const urls = expired
    .map((r) => r.apply_url)
    .filter((u): u is string => Boolean(u));
  const ids = expired.map((r) => r.id);

  let deletedPosts = 0;
  if (urls.length) {
    const { data: bot } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", BOT_USERNAME)
      .maybeSingle();
    if (bot?.id) {
      // Delete in chunks — PostgREST in() limits
      for (let i = 0; i < urls.length; i += 80) {
        const chunk = urls.slice(i, i + 80);
        const { data: posts, error: postErr } = await supabase
          .from("posts")
          .delete()
          .eq("author_id", bot.id)
          .eq("type", "opportunity")
          .in("link_url", chunk)
          .select("id");
        if (postErr) throw new Error(`purge posts: ${postErr.message}`);
        deletedPosts += posts?.length || 0;
      }
    }
  }

  let deletedJobs = 0;
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const { data: deleted, error: delErr } = await supabase
      .from("opportunities")
      .delete()
      .in("id", chunk)
      .select("id");
    if (delErr) throw new Error(`purge jobs: ${delErr.message}`);
    deletedJobs += deleted?.length || 0;
  }

  return { deletedJobs, deletedPosts };
}

async function ensureJobsBot(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", BOT_USERNAME)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: BOT_EMAIL,
    password: crypto.randomUUID() + "Aa1!",
    email_confirm: true,
    user_metadata: {
      full_name: "DevCircle Jobs Bot",
      username: BOT_USERNAME,
    },
  });
  if (error || !created.user) {
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", "DevCircle Jobs Bot")
      .maybeSingle();
    if (byEmail?.id) {
      await supabase
        .from("profiles")
        .update({
          username: BOT_USERNAME,
          full_name: "DevCircle Jobs Bot",
          headline: "Auto-posts real jobs & OSS into matching communities",
          onboarding_complete: true,
          is_demo: false,
        })
        .eq("id", byEmail.id);
      return byEmail.id;
    }
    throw new Error(error?.message || "Failed to create jobs bot user");
  }

  await supabase
    .from("profiles")
    .update({
      username: BOT_USERNAME,
      full_name: "DevCircle Jobs Bot",
      headline:
        "Auto-posts jobs from Remotive, Remote OK, Arbeitnow, The Muse, Jobicy, Himalayas, Greenhouse, Ashby, Lever, HN Who is Hiring (+ optional Adzuna India)",
      bio: "Fetches publicly available tech jobs from open job-board APIs every 30 minutes and shares them into skill-matched communities. LinkedIn/Naukri/Indeed are link-out only (no scrape).",
      onboarding_complete: true,
      is_demo: false,
      role: "student",
    })
    .eq("id", created.user.id);

  return created.user.id;
}

function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  const out: NormalizedJob[] = [];
  // Prefer India-focused listings when URLs collide
  const sorted = [...jobs].sort(
    (a, b) => Number(b.india_focus) - Number(a.india_focus)
  );
  for (const j of sorted) {
    const key = j.apply_url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

export async function ingestJobs(options?: {
  includeRemotive?: boolean;
  maxInsert?: number;
  postToCommunities?: boolean;
}): Promise<IngestResult> {
  const includeRemotive = options?.includeRemotive ?? true;
  const maxInsert = options?.maxInsert ?? 50;
  const postToCommunities = options?.postToCommunities ?? true;

  const supabase = createServiceClient();
  const errors: string[] = [];
  const sources: string[] = [];

  const { data: skillRows } = await supabase.from("skills").select("name");
  const catalog = (skillRows || []).map((s) => s.name).filter(Boolean);
  let expired = 0;
  try {
    const purged = await purgeExpiredJobs(supabase);
    expired = purged.deletedJobs;
    if (purged.deletedJobs || purged.deletedPosts) {
      sources.push(
        `purged:${purged.deletedJobs}jobs/${purged.deletedPosts}posts(>${JOB_RETENTION_DAYS}d)`
      );
    }
  } catch (e) {
    errors.push(`purge: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (catalog.length === 0) {
    return {
      fetched: 0,
      inserted: 0,
      posted: 0,
      skipped: 0,
      expired,
      sources,
      errors: errors.length
        ? errors
        : ["No skills in DB — run seed first"],
      india: 0,
    };
  }

  const batches: NormalizedJob[] = [];
  let staleFromSource = 0;

  async function run(
    label: string,
    fn: () => Promise<NormalizedJob[]>
  ): Promise<void> {
    try {
      const jobs = await fn();
      const fresh = jobs.filter((j) => isFreshPortalDate(j.posted_at));
      staleFromSource += jobs.length - fresh.length;
      batches.push(...fresh);
      sources.push(`${label}:${fresh.length}`);
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await run("Arbeitnow", () => fetchArbeitnowJobs(catalog));
  await run("RemoteOK", () => fetchRemoteOkJobs(catalog));
  await run("TheMuse", () => fetchTheMuseJobs(catalog));
  await run("Jobicy", () => fetchJobicyJobs(catalog));
  await run("Himalayas", () => fetchHimalayasJobs(catalog));
  await run("Greenhouse", () => fetchGreenhouseJobs(catalog));
  await run("Ashby", () => fetchAshbyJobs(catalog));
  await run("Lever", () => fetchLeverJobs(catalog));
  await run("HNHiring", () => fetchHnWhoIsHiringJobs(catalog));
  await run("AdzunaIN", () => fetchAdzunaIndiaJobs(catalog));

  if (includeRemotive) {
    await run("Remotive", () => fetchRemotiveJobs(catalog));
    await run("RemotiveIN", () => fetchRemotiveIndiaJobs(catalog));
  }

  if (staleFromSource > 0) {
    sources.push(`ignored_stale:${staleFromSource}`);
  }

  const jobs = dedupeJobs(batches);
  const india = jobs.filter((j) => j.india_focus).length;

  // Prefer India / internship listings from job boards only
  const prioritized = [...jobs].sort((a, b) => {
    const score = (j: NormalizedJob) =>
      (j.india_focus ? 3 : 0) + (j.type === "internship" ? 1 : 0) + 1;
    return score(b) - score(a);
  });

  const urls = prioritized.map((j) => j.apply_url);
  const { data: existing } = urls.length
    ? await supabase
        .from("opportunities")
        .select("id, apply_url, description, source")
        .in("apply_url", urls)
    : { data: [] as { id: string; apply_url: string; description: string | null; source: string | null }[] };

  const existingByUrl = new Map(
    (existing || []).map((r) => [(r.apply_url || "").toLowerCase(), r])
  );

  // Fix wrong "Posted by … on 2 Oct" lines that used ingest day instead of portal date
  let repaired = 0;
  for (const job of prioritized) {
    if (!job.posted_at) continue;
    const row = existingByUrl.get(job.apply_url.toLowerCase());
    if (!row) continue;
    const correct = postedByLine(job.source, job.posted_at);
    if ((row.description || "").includes(correct)) continue;
    const nextDesc = withPostedByLine(
      row.description || job.description,
      job.source,
      job.posted_at
    );
    const { error: repairErr } = await supabase
      .from("opportunities")
      .update({ description: nextDesc, source: job.source })
      .eq("id", row.id);
    if (!repairErr) repaired += 1;
  }
  if (repaired > 0) sources.push(`repaired_dates:${repaired}`);

  const fresh = prioritized
    .filter((j) => !existingByUrl.has(j.apply_url.toLowerCase()))
    .slice(0, maxInsert);

  let inserted = 0;
  const insertedJobs: NormalizedJob[] = [];

  if (fresh.length) {
    const { data, error } = await supabase
      .from("opportunities")
      .insert(
        fresh.map((j) => ({
          title: j.title,
          company: j.company,
          type: j.type,
          work_mode: j.work_mode,
          location: j.location,
          skills: j.skills,
          stipend: j.stipend,
          description: withPostedByLine(j.description, j.source, j.posted_at),
          apply_url: j.apply_url,
          source: j.source,
          experience_level: j.experience_level,
          is_demo: false,
        }))
      )
      .select("id, apply_url, skills, title, company, description");

    if (error) {
      errors.push(`insert: ${error.message}`);
    } else {
      inserted = data?.length || 0;
      for (const row of data || []) {
        const match = fresh.find((f) => f.apply_url === row.apply_url);
        if (match) insertedJobs.push(match);
      }
    }
  }

  let posted = 0;
  if (postToCommunities && insertedJobs.length) {
    try {
      const botId = await ensureJobsBot(supabase);
      const { data: communities } = await supabase
        .from("communities")
        .select("id, name, slug, skill:skills(name)")
        .not("skill_id", "is", null);

      const bySkill = new Map<
        string,
        { id: string; name: string; slug: string }[]
      >();
      const communityById = new Map<
        string,
        { id: string; name: string; slug: string }
      >();
      for (const c of communities || []) {
        const skillName = (c.skill as unknown as { name?: string } | null)?.name;
        const row = { id: c.id, name: c.name, slug: c.slug };
        communityById.set(c.id, row);
        if (!skillName) continue;
        const list = bySkill.get(skillName) || [];
        list.push(row);
        bySkill.set(skillName, list);
      }

      const posts: {
        author_id: string;
        community_id: string;
        type: "opportunity";
        content: string;
        link_url: string;
        is_demo: boolean;
      }[] = [];
      const postKeys = new Set<string>();
      const digestMap = new Map<
        string,
        { count: number; latestTitle: string }
      >();

      // Community-wise: post into matching skill communities (cap 3 per job)
      for (const job of insertedJobs.slice(0, 40)) {
        const targets: { id: string; name: string; slug: string }[] = [];
        for (const skill of job.skills) {
          for (const c of bySkill.get(skill) || []) {
            if (!targets.some((t) => t.id === c.id)) targets.push(c);
          }
        }
        for (const target of targets.slice(0, 3)) {
          const key = `${target.id}:${job.apply_url}`;
          if (postKeys.has(key)) continue;
          postKeys.add(key);
          const badge = job.india_focus ? "🇮🇳 India" : "💼 Job";
          const headline = `${job.title} @ ${job.company}`;
          const byLine = postedByLine(job.source, job.posted_at);
          posts.push({
            author_id: botId,
            community_id: target.id,
            type: "opportunity",
            content: [
              `${badge} ${headline}`,
              job.location ? `📍 ${job.location}` : null,
              job.skills.length ? `Skills: ${job.skills.join(", ")}` : null,
              "",
              job.description.slice(0, 260),
              "",
              byLine,
            ]
              .filter((line) => line !== null)
              .join("\n"),
            link_url: job.apply_url,
            is_demo: false,
          });
          const prev = digestMap.get(target.id) || {
            count: 0,
            latestTitle: headline,
          };
          digestMap.set(target.id, {
            count: prev.count + 1,
            latestTitle: prev.count === 0 ? headline : prev.latestTitle,
          });
        }
      }

      if (posts.length) {
        for (let i = 0; i < posts.length; i += 40) {
          const chunk = posts.slice(i, i + 40);
          const { error: postErr } = await supabase.from("posts").insert(chunk);
          if (postErr) errors.push(`posts: ${postErr.message}`);
          else posted += chunk.length;
        }

        // Notify members of each joined community that received new jobs
        try {
          const { notifyJobDigests } = await import("@/lib/notifications");
          const digests = [...digestMap.entries()]
            .map(([communityId, d]) => {
              const c = communityById.get(communityId);
              if (!c) return null;
              return {
                communityId,
                communityName: c.name,
                communitySlug: c.slug,
                count: d.count,
                latestTitle: d.latestTitle,
              };
            })
            .filter(Boolean) as Array<{
            communityId: string;
            communityName: string;
            communitySlug: string;
            count: number;
            latestTitle: string;
          }>;

          const notified = await notifyJobDigests(supabase, digests, [botId]);
          sources.push(`notified:${notified}`);
        } catch (e) {
          errors.push(
            `notify: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    } catch (e) {
      errors.push(`bot/posts: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    fetched: jobs.length,
    inserted,
    posted,
    skipped: jobs.length - fresh.length + staleFromSource,
    expired,
    sources,
    errors,
    india,
  };
}
