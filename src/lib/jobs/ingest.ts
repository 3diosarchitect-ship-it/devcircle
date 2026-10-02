import { createServiceClient } from "@/lib/supabase/middleware";
import {
  fetchArbeitnowJobs,
  fetchRemoteOkJobs,
  fetchRemotiveJobs,
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
    // Race: profile may exist under another username from trigger
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
          headline: "Auto-posts real jobs from public boards",
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
      headline: "Auto-posts real jobs from public boards (Arbeitnow, Remote OK, Remotive)",
      bio: "I fetch publicly available tech jobs every hour and share matching roles in your communities. Tap the link to apply on the original board — not LinkedIn scrape.",
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
  for (const j of jobs) {
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
  const maxInsert = options?.maxInsert ?? 40;
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
    };
  }

  const batches: NormalizedJob[] = [];
  try {
    const jobs = await fetchArbeitnowJobs(catalog);
    batches.push(...jobs);
    sources.push(`Arbeitnow:${jobs.length}`);
  } catch (e) {
    errors.push(`Arbeitnow: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const jobs = await fetchRemoteOkJobs(catalog);
    batches.push(...jobs);
    sources.push(`RemoteOK:${jobs.length}`);
  } catch (e) {
    errors.push(`RemoteOK: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (includeRemotive) {
    try {
      const jobs = await fetchRemotiveJobs(catalog);
      batches.push(...jobs);
      sources.push(`Remotive:${jobs.length}`);
    } catch (e) {
      errors.push(`Remotive: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const jobs = dedupeJobs(batches);
  const urls = jobs.map((j) => j.apply_url);

  const { data: existing } = urls.length
    ? await supabase.from("opportunities").select("apply_url").in("apply_url", urls)
    : { data: [] as { apply_url: string }[] };

  const existingUrls = new Set(
    (existing || []).map((r) => (r.apply_url || "").toLowerCase())
  );

  const fresh = jobs
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
        .select("id, name, skill:skills(name)")
        .not("skill_id", "is", null);

      const bySkill = new Map<string, { id: string; name: string }[]>();
      for (const c of communities || []) {
        const skillName = (c.skill as unknown as { name?: string } | null)?.name;
        if (!skillName) continue;
        const list = bySkill.get(skillName) || [];
        list.push({ id: c.id, name: c.name });
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

      // Avoid flooding: at most one community post per job (best skill match)
      for (const job of insertedJobs.slice(0, 25)) {
        let target: { id: string; name: string } | null = null;
        for (const skill of job.skills) {
          const list = bySkill.get(skill);
          if (list?.length) {
            target = list[0];
            break;
          }
        }
        if (!target) continue;
        posts.push({
          author_id: botId,
          community_id: target.id,
          type: "opportunity",
          content: [
            `🆕 ${job.title} @ ${job.company}`,
            job.location ? `📍 ${job.location}` : null,
            job.skills.length ? `Skills: ${job.skills.join(", ")}` : null,
            "",
            job.description.slice(0, 280),
            "",
            `Source: ${job.source} · auto-shared by DevCircle Jobs Bot`,
          ]
            .filter((line) => line !== null)
            .join("\n"),
          link_url: job.apply_url,
          is_demo: false,
        });
      }

      if (posts.length) {
        const { error: postErr } = await supabase.from("posts").insert(posts);
        if (postErr) errors.push(`posts: ${postErr.message}`);
        else posted = posts.length;
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
  };
}
