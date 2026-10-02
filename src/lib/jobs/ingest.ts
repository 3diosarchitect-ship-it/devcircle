import { createServiceClient } from "@/lib/supabase/middleware";
import {
  fetchAdzunaIndiaJobs,
  fetchArbeitnowJobs,
  fetchHimalayasJobs,
  fetchJobicyJobs,
  fetchRemoteOkJobs,
  fetchRemotiveIndiaJobs,
  fetchRemotiveJobs,
  fetchTheMuseJobs,
  type NormalizedJob,
} from "@/lib/jobs/sources";

const BOT_EMAIL = "jobs-bot@devcircle.app";
const BOT_USERNAME = "devcirclebot";

export type IngestResult = {
  fetched: number;
  inserted: number;
  posted: number;
  skipped: number;
  sources: string[];
  errors: string[];
  india: number;
};

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
        "Auto-posts jobs from Remotive, Remote OK, Arbeitnow, The Muse, Jobicy, Himalayas (+ optional Adzuna India)",
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
  if (catalog.length === 0) {
    return {
      fetched: 0,
      inserted: 0,
      posted: 0,
      skipped: 0,
      sources: [],
      errors: ["No skills in DB — run seed first"],
      india: 0,
    };
  }

  const batches: NormalizedJob[] = [];

  async function run(
    label: string,
    fn: () => Promise<NormalizedJob[]>
  ): Promise<void> {
    try {
      const jobs = await fn();
      batches.push(...jobs);
      sources.push(`${label}:${jobs.length}`);
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await run("Arbeitnow", () => fetchArbeitnowJobs(catalog));
  await run("RemoteOK", () => fetchRemoteOkJobs(catalog));
  await run("TheMuse", () => fetchTheMuseJobs(catalog));
  await run("Jobicy", () => fetchJobicyJobs(catalog));
  await run("Himalayas", () => fetchHimalayasJobs(catalog));
  await run("AdzunaIN", () => fetchAdzunaIndiaJobs(catalog));

  if (includeRemotive) {
    await run("Remotive", () => fetchRemotiveJobs(catalog));
    await run("RemotiveIN", () => fetchRemotiveIndiaJobs(catalog));
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
    ? await supabase.from("opportunities").select("apply_url").in("apply_url", urls)
    : { data: [] as { apply_url: string }[] };

  const existingUrls = new Set(
    (existing || []).map((r) => (r.apply_url || "").toLowerCase())
  );

  const fresh = prioritized
    .filter((j) => !existingUrls.has(j.apply_url.toLowerCase()))
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
          description: j.description,
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
              `Matched to ${target.name} · Source: ${job.source}`,
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
    skipped: jobs.length - fresh.length,
    sources,
    errors,
    india,
  };
}
