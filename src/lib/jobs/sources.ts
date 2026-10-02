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

/** The Muse public jobs API (no key) — software + internships. */
export async function fetchTheMuseJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const queries = [
    "category=Software%20Engineering",
    "category=Software%20Engineering&level=Internship",
    "category=Data%20Science",
    "category=Design%20and%20UX",
  ];
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const res = await fetch(
      `https://www.themuse.com/api/public/jobs?${q}&page=0`,
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
      results?: Array<{
        name?: string;
        company?: { name?: string };
        locations?: Array<{ name?: string }>;
        levels?: Array<{ name?: string; short_name?: string }>;
        refs?: { landing_page?: string };
        contents?: string;
        categories?: Array<{ name?: string }>;
      }>;
    };

    for (const j of json.results || []) {
      const apply = (j.refs?.landing_page || "").trim();
      if (!apply || !j.name || seen.has(apply)) continue;
      seen.add(apply);
      const loc = (j.locations || []).map((l) => l.name).filter(Boolean).join(", ");
      const levels = (j.levels || []).map((l) => l.name || l.short_name || "").join(" ");
      const cats = (j.categories || []).map((c) => c.name || "");
      const plain = stripHtml(j.contents || "").slice(0, 600);
      if (!isTechJob(j.name, [...cats, ...levels])) continue;
      const skills = matchSkills(cats, catalog, j.name, plain);
      if (skills.length === 0) continue;
      const india = isIndiaLocation(loc, j.name, plain);
      out.push({
        title: j.name.trim(),
        company: (j.company?.name || "Company").trim(),
        type: mapJobType(levels || j.name),
        work_mode: /remote/i.test(loc) ? "remote" : "hybrid",
        location: loc || "See listing",
        skills,
        stipend: null,
        description: plain || j.name,
        apply_url: apply,
        source: india ? "The Muse · India" : "The Muse",
        experience_level: /intern/i.test(levels + j.name) ? "internship" : "junior",
        india_focus: india,
      });
    }
  }
  return out;
}

/** Jobicy remote jobs API (no key). */
export async function fetchJobicyJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const tags = ["javascript", "python", "react", "java", "typescript", "devops"];
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const res = await fetch(
      `https://jobicy.com/api/v2/remote-jobs?count=20&tag=${encodeURIComponent(tag)}`,
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
        url?: string;
        jobTitle?: string;
        companyName?: string;
        jobIndustry?: string[];
        jobType?: string[];
        jobGeo?: string;
        jobLevel?: string;
        jobExcerpt?: string;
        jobDescription?: string;
      }>;
    };

    for (const j of json.jobs || []) {
      const apply = (j.url || "").trim();
      if (!apply || !j.jobTitle || seen.has(apply)) continue;
      seen.add(apply);
      const tagsArr = [
        ...(j.jobIndustry || []),
        ...(j.jobType || []),
        tag,
        j.jobLevel || "",
      ];
      const plain = stripHtml(j.jobDescription || j.jobExcerpt || "").slice(0, 600);
      if (!isTechJob(j.jobTitle, tagsArr)) continue;
      const skills = matchSkills(tagsArr, catalog, j.jobTitle, plain);
      if (skills.length === 0) continue;
      const loc = j.jobGeo || "Remote";
      const india = isIndiaLocation(loc, j.jobTitle, plain);
      out.push({
        title: j.jobTitle.trim(),
        company: (j.companyName || "Company").trim(),
        type: mapJobType(j.jobType || j.jobTitle),
        work_mode: "remote",
        location: loc,
        skills,
        stipend: null,
        description: plain || j.jobTitle,
        apply_url: apply,
        source: india ? "Jobicy · India" : "Jobicy",
        experience_level: /intern|entry/i.test(
          `${j.jobLevel || ""} ${j.jobTitle}`
        )
          ? "internship"
          : "junior",
        india_focus: india,
      });
    }
  }
  return out;
}

/** Himalayas remote jobs API (no key) — global + India search. */
export async function fetchHimalayasJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const endpoints = [
    "https://himalayas.app/jobs/api?limit=40",
    "https://himalayas.app/jobs/api/search?q=software+engineer&limit=30",
    "https://himalayas.app/jobs/api/search?q=react&country=IN&limit=25",
    "https://himalayas.app/jobs/api/search?q=python+developer&country=IN&limit=25",
    "https://himalayas.app/jobs/api/search?q=internship&employment_type=Intern&limit=20",
  ];
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      next: { revalidate: 0 },
      headers: {
        Accept: "application/json",
        "User-Agent": "DevCircleJobsBot/1.0",
      },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      jobs?: Array<{
        title?: string;
        excerpt?: string;
        companyName?: string;
        employmentType?: string;
        seniority?: string[];
        categories?: string[];
        description?: string;
        applicationLink?: string;
        guid?: string;
        locationRestrictions?: string[];
        minSalary?: number;
        maxSalary?: number;
        currency?: string;
        salaryPeriod?: string;
      }>;
    };

    for (const j of json.jobs || []) {
      const apply = (j.applicationLink || j.guid || "").trim();
      if (!apply.startsWith("http") || !j.title || seen.has(apply)) continue;
      seen.add(apply);
      const cats = j.categories || [];
      const plain = stripHtml(j.description || j.excerpt || "").slice(0, 600);
      if (!isTechJob(j.title, cats)) continue;
      const skills = matchSkills(cats, catalog, j.title, plain);
      if (skills.length === 0) continue;
      const loc = (j.locationRestrictions || []).join(", ") || "Remote";
      const india = isIndiaLocation(loc, j.title, plain);
      const stipend =
        j.minSalary || j.maxSalary
          ? `${j.currency || ""} ${j.minSalary || "?"}–${j.maxSalary || "?"} / ${j.salaryPeriod || "yr"}`.trim()
          : null;
      out.push({
        title: j.title.trim(),
        company: (j.companyName || "Company").trim(),
        type: mapJobType(
          [j.employmentType || "", ...(j.seniority || []), j.title].join(" ")
        ),
        work_mode: "remote",
        location: loc,
        skills,
        stipend,
        description: plain || j.title,
        apply_url: apply,
        source: india ? "Himalayas · India" : "Himalayas",
        experience_level: /intern|entry/i.test(
          `${(j.seniority || []).join(" ")} ${j.employmentType || ""} ${j.title}`
        )
          ? "internship"
          : "junior",
        india_focus: india,
      });
    }
  }
  return out;
}
