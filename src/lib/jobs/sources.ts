import type { OpportunityType, WorkMode } from "@/types";

export type NormalizedJob = {
  title: string;
  company: string;
  type: OpportunityType;
  work_mode: WorkMode;
  location: string | null;
  skills: string[];
  stipend: string | null;
  description: string;
  apply_url: string;
  source: string;
  experience_level: string;
};

const TECH_HINT =
  /react|node|python|django|java|typescript|javascript|swift|kotlin|flutter|android|ios|devops|aws|cloud|mongo|mern|sql|backend|frontend|full.?stack|software|engineer|developer|ml|machine learning|ai|data|ux|ui|design|security|golang|rust|c\+\+|mobile|web/i;

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapJobType(raw: string | string[] | null | undefined): OpportunityType {
  const s = (Array.isArray(raw) ? raw.join(" ") : raw || "").toLowerCase();
  if (/intern/.test(s)) return "internship";
  if (/freelance|contract|part.?time/.test(s)) return "freelance";
  if (/full.?time|permanent/.test(s)) return "full_time";
  return "full_time";
}

/** Map free-text tags onto DevCircle skill names from DB. */
export function matchSkills(
  tags: string[],
  catalog: string[],
  title = "",
  description = ""
): string[] {
  const hay = `${tags.join(" ")} ${title} ${description}`.toLowerCase();
  const found: string[] = [];
  for (const skill of catalog) {
    const needle = skill.toLowerCase();
    const compact = needle.replace(/[^a-z0-9]/g, "");
    if (
      hay.includes(needle) ||
      (compact.length > 2 && hay.replace(/[^a-z0-9]/g, "").includes(compact))
    ) {
      found.push(skill);
    }
  }
  // Common aliases
  const aliases: Record<string, string> = {
    reactjs: "React",
    "react.js": "React",
    nodejs: "Node.js",
    "node.js": "Node.js",
    typescript: "TypeScript",
    javascript: "JavaScript",
    python: "Python",
    django: "Django",
    mongodb: "MongoDB",
    flutter: "Flutter",
    android: "Android",
    ios: "iOS",
    swift: "Swift",
    devops: "DevOps",
    aws: "Cloud",
    kubernetes: "AI / ML",
    "machine learning": "AI / ML",
  };
  for (const [alias, skill] of Object.entries(aliases)) {
    if (hay.includes(alias) && catalog.includes(skill) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  return [...new Set(found)].slice(0, 8);
}

function isTechJob(title: string, tags: string[]): boolean {
  const blob = `${title} ${tags.join(" ")}`;
  return TECH_HINT.test(blob);
}

export async function fetchArbeitnowJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    next: { revalidate: 0 },
    headers: { Accept: "application/json", "User-Agent": "DevCircleJobsBot/1.0" },
  });
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{
      title: string;
      company_name: string;
      description?: string;
      remote?: boolean;
      url: string;
      tags?: string[];
      job_types?: string[];
      location?: string;
    }>;
  };

  const out: NormalizedJob[] = [];
  for (const j of json.data || []) {
    if (!j.url || !j.title) continue;
    if (!j.remote && !isTechJob(j.title, j.tags || [])) continue;
    if (!isTechJob(j.title, j.tags || [])) continue;
    const plain = stripHtml(j.description || "").slice(0, 600);
    const skills = matchSkills(j.tags || [], catalog, j.title, plain);
    if (skills.length === 0) continue;
    out.push({
      title: j.title.trim(),
      company: (j.company_name || "Company").trim(),
      type: mapJobType(j.job_types),
      work_mode: j.remote ? "remote" : "onsite",
      location: j.location || (j.remote ? "Remote" : null),
      skills,
      stipend: null,
      description: plain || `${j.title} at ${j.company_name}`,
      apply_url: j.url.trim(),
      source: "Arbeitnow",
      experience_level: /intern/i.test(j.title) ? "internship" : "junior",
    });
  }
  return out;
}

export async function fetchRemoteOkJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    next: { revalidate: 0 },
    headers: {
      Accept: "application/json",
      "User-Agent": "DevCircleJobsBot/1.0 (student communities)",
    },
  });
  if (!res.ok) throw new Error(`RemoteOK ${res.status}`);
  const json = (await res.json()) as Array<Record<string, unknown>>;

  const out: NormalizedJob[] = [];
  for (const row of json) {
    if (!row.id || !row.position) continue;
    const title = String(row.position);
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
    if (!isTechJob(title, tags)) continue;
    const url = String(row.url || row.apply_url || "").trim();
    if (!url.startsWith("http")) continue;
    const plain = stripHtml(String(row.description || "")).slice(0, 600);
    const skills = matchSkills(tags, catalog, title, plain);
    if (skills.length === 0) continue;
    out.push({
      title,
      company: String(row.company || "Company").trim(),
      type: mapJobType(tags.join(" ")),
      work_mode: "remote",
      location: String(row.location || "Remote"),
      skills,
      stipend: row.salary ? String(row.salary) : null,
      description: plain || `${title} at ${row.company}`,
      apply_url: url,
      source: "Remote OK",
      experience_level: /intern/i.test(title) ? "internship" : "junior",
    });
  }
  return out;
}

/** Remotive asks ≤4 requests/day — call sparingly from cron. */
export async function fetchRemotiveJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const res = await fetch(
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=40",
    {
      next: { revalidate: 0 },
      headers: { Accept: "application/json", "User-Agent": "DevCircleJobsBot/1.0" },
    }
  );
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const json = (await res.json()) as {
    jobs?: Array<{
      title: string;
      company_name: string;
      url: string;
      tags?: string[];
      job_type?: string;
      salary?: string;
      description?: string;
      candidate_required_location?: string;
    }>;
  };

  const out: NormalizedJob[] = [];
  for (const j of json.jobs || []) {
    if (!j.url || !j.title) continue;
    const plain = stripHtml(j.description || "").slice(0, 600);
    const skills = matchSkills(j.tags || [], catalog, j.title, plain);
    if (skills.length === 0) continue;
    out.push({
      title: j.title.trim(),
      company: (j.company_name || "Company").trim(),
      type: mapJobType(j.job_type),
      work_mode: "remote",
      location: j.candidate_required_location || "Remote",
      skills,
      stipend: j.salary || null,
      description: plain || `${j.title} at ${j.company_name}`,
      apply_url: j.url.trim(),
      source: "Remotive",
      experience_level: /intern/i.test(j.title) ? "internship" : "junior",
    });
  }
  return out;
}
