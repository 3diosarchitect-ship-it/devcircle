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
  /** Prefer matching into India-focused community feeds */
  india_focus?: boolean;
};

const TECH_HINT =
  /react|node|python|django|java|typescript|javascript|swift|kotlin|flutter|android|ios|devops|aws|cloud|mongo|mern|sql|backend|frontend|full.?stack|software|engineer|developer|ml|machine learning|ai|data|ux|ui|design|security|golang|rust|c\+\+|mobile|web|internship|freelance/i;

const INDIA_HINT =
  /\b(india|indian|bangalore|bengaluru|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|chennai|pune|kolkata|ahmedabad|jaipur|indore|remote.?india|india.?remote)\b/i;

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

export function isIndiaLocation(...parts: (string | null | undefined)[]): boolean {
  return INDIA_HINT.test(parts.filter(Boolean).join(" "));
}

export function mapJobType(raw: string | string[] | null | undefined): OpportunityType {
  const s = (Array.isArray(raw) ? raw.join(" ") : raw || "").toLowerCase();
  if (/intern/.test(s)) return "internship";
  if (/freelance|contract|part.?time|gig/.test(s)) return "freelance";
  if (/open.?source|contribute|good first/.test(s)) return "project";
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
    gcp: "Cloud",
    azure: "Cloud",
    kubernetes: "AI / ML",
    "machine learning": "AI / ML",
    kotlin: "Android",
  };
  for (const [alias, skill] of Object.entries(aliases)) {
    if (hay.includes(alias) && catalog.includes(skill) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  return [...new Set(found)].slice(0, 8);
}

function isTechJob(title: string, tags: string[]): boolean {
  return TECH_HINT.test(`${title} ${tags.join(" ")}`);
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
    if (!isTechJob(j.title, j.tags || [])) continue;
    const plain = stripHtml(j.description || "").slice(0, 600);
    const skills = matchSkills(j.tags || [], catalog, j.title, plain);
    if (skills.length === 0) continue;
    const india = isIndiaLocation(j.location, j.title, plain);
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
      source: india ? "Arbeitnow · India" : "Arbeitnow",
      experience_level: /intern/i.test(j.title) ? "internship" : "junior",
      india_focus: india,
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
    const location = String(row.location || "Remote");
    const india = isIndiaLocation(location, title, tags.join(" "), plain);
    out.push({
      title,
      company: String(row.company || "Company").trim(),
      type: mapJobType(tags.join(" ")),
      work_mode: "remote",
      location,
      skills,
      stipend: row.salary ? String(row.salary) : null,
      description: plain || `${title} at ${row.company}`,
      apply_url: url,
      source: india ? "Remote OK · India" : "Remote OK",
      experience_level: /intern/i.test(title) ? "internship" : "junior",
      india_focus: india,
    });
  }
  return out;
}

/** Remotive asks ≤4 requests/day — call sparingly from cron. */
export async function fetchRemotiveJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const res = await fetch(
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=50",
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
    const loc = j.candidate_required_location || "Remote";
    const india = isIndiaLocation(loc, j.title, plain);
    out.push({
      title: j.title.trim(),
      company: (j.company_name || "Company").trim(),
      type: mapJobType(j.job_type),
      work_mode: "remote",
      location: loc,
      skills,
      stipend: j.salary || null,
      description: plain || `${j.title} at ${j.company_name}`,
      apply_url: j.url.trim(),
      source: india ? "Remotive · India" : "Remotive",
      experience_level: /intern/i.test(j.title) ? "internship" : "junior",
      india_focus: india,
    });
  }
  return out;
}

/**
 * India-friendly Remotive search (internships / India remote).
 * Counts toward Remotive rate limit — only call with includeRemotive.
 */
export async function fetchRemotiveIndiaJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const queries = ["india", "internship india", "bangalore"];
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=20`,
      {
        next: { revalidate: 0 },
        headers: {
          Accept: "application/json",
          "User-Agent": "DevCircleJobsBot/1.0",
        },
      }
    );
    if (!res.ok) continue;
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
        category?: string;
      }>;
    };
    for (const j of json.jobs || []) {
      if (!j.url || !j.title || seen.has(j.url)) continue;
      seen.add(j.url);
      const plain = stripHtml(j.description || "").slice(0, 600);
      const skills = matchSkills(j.tags || [], catalog, j.title, plain);
      if (skills.length === 0 && !isTechJob(j.title, j.tags || [])) continue;
      const loc = j.candidate_required_location || "India / Remote";
      out.push({
        title: j.title.trim(),
        company: (j.company_name || "Company").trim(),
        type: mapJobType(j.job_type || j.title),
        work_mode: "remote",
        location: loc,
        skills: skills.length ? skills : matchSkills(["JavaScript"], catalog, j.title, plain),
        stipend: j.salary || null,
        description: plain || `${j.title} at ${j.company_name}`,
        apply_url: j.url.trim(),
        source: "Remotive · India",
        experience_level: /intern/i.test(j.title) ? "internship" : "junior",
        india_focus: true,
      });
    }
  }
  return out.filter((j) => j.skills.length > 0);
}

/** Optional Adzuna India API (free tier) — set ADZUNA_APP_ID + ADZUNA_APP_KEY */
export async function fetchAdzunaIndiaJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const queries = [
    "software developer internship",
    "react developer",
    "python developer freelance",
    "full stack developer",
  ];
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const what of queries) {
    const url =
      `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${encodeURIComponent(appId)}` +
      `&app_key=${encodeURIComponent(appKey)}` +
      `&results_per_page=15&what=${encodeURIComponent(what)}&content-type=application/json`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "DevCircleJobsBot/1.0" },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      results?: Array<{
        title?: string;
        company?: { display_name?: string };
        description?: string;
        redirect_url?: string;
        location?: { display_name?: string };
        contract_type?: string;
        salary_min?: number;
        salary_max?: number;
      }>;
    };
    for (const j of json.results || []) {
      const apply = (j.redirect_url || "").trim();
      if (!apply || !j.title || seen.has(apply)) continue;
      seen.add(apply);
      const plain = stripHtml(j.description || "").slice(0, 600);
      const skills = matchSkills([], catalog, j.title, plain);
      if (skills.length === 0) continue;
      const stipend =
        j.salary_min || j.salary_max
          ? `₹${j.salary_min || "?"}–${j.salary_max || "?"}`
          : null;
      out.push({
        title: j.title.trim(),
        company: (j.company?.display_name || "Company").trim(),
        type: mapJobType(j.contract_type || j.title),
        work_mode: /remote/i.test(plain + (j.location?.display_name || ""))
          ? "remote"
          : "hybrid",
        location: j.location?.display_name || "India",
        skills,
        stipend,
        description: plain || j.title,
        apply_url: apply,
        source: "Adzuna · India",
        experience_level: /intern/i.test(j.title) ? "internship" : "junior",
        india_focus: true,
      });
    }
  }
  return out;
}
