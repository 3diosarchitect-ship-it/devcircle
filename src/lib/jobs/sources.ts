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
  /** When the job was listed on the source portal (ISO or Date-parseable) */
  posted_at?: string | null;
};

/** Clean portal name for display: "Himalayas · India" → "Himalayas" */
export function portalDisplayName(source: string): string {
  return source.split("·")[0].trim() || source;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** e.g. 14 Sep 2026 — always from portal date when provided, never "today" by accident */
export function formatPortalDate(date?: string | Date | null): string {
  let d: Date | null = null;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "string" && date.trim()) {
    // Remotive sends "2026-09-14T20:33:27" without Z — treat as UTC
    const raw = date.trim();
    d = new Date(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) &&
        !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
        ? `${raw}Z`
        : raw
    );
  }
  if (!d || Number.isNaN(d.getTime())) {
    return "unknown date";
  }
  const day = d.getUTCDate();
  const month = SHORT_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/** Line for job description: Posted by Himalayas on 14 Sep 2026 */
export function postedByLine(
  source: string,
  postedAt?: string | Date | null
): string {
  if (postedAt == null || postedAt === "") {
    return `Posted by ${portalDisplayName(source)}`;
  }
  return `Posted by ${portalDisplayName(source)} on ${formatPortalDate(postedAt)}`;
}

/** Replace or append the Posted by line using the portal listing date. */
export function withPostedByLine(
  description: string,
  source: string,
  postedAt?: string | Date | null
): string {
  const line = postedByLine(source, postedAt);
  const stripped = description.replace(/\n*Posted by .+?( on .+)?$/m, "").trim();
  return `${stripped}\n\n${line}`;
}

const TECH_HINT =
  /react|node|python|django|java|typescript|javascript|swift|kotlin|flutter|android|ios|devops|aws|cloud|mongo|mern|sql|backend|frontend|full.?stack|software|engineer|developer|ml|machine learning|ai|data|ux|ui|design|security|golang|rust|c\+\+|mobile|web|internship|freelance/i;

const INDIA_HINT =
  /\b(india|indian|bangalore|bengaluru|mumbai|delhi|noida|gurgaon|gurugram|hyderabad|chennai|pune|kolkata|ahmedabad|jaipur|indore|remote.?india|india.?remote)\b/i;

export function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
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
      created_at?: string;
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
      posted_at: j.created_at || null,
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
      posted_at: row.date ? String(row.date) : null,
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
      publication_date?: string;
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
      posted_at: j.publication_date || null,
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
        publication_date?: string;
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
        posted_at: j.publication_date || null,
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
        pubDate?: number | string;
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
      const postedAt =
        typeof j.pubDate === "number"
          ? new Date(j.pubDate * (j.pubDate < 2e10 ? 1000 : 1)).toISOString()
          : j.pubDate
            ? String(j.pubDate)
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
        posted_at: postedAt,
      });
    }
  }
  return out;
}

/** Curated Greenhouse public boards (no auth). Discord careers use this board. */
const GREENHOUSE_BOARDS = [
  "groww",
  "airbnb",
  "dropbox",
  "discord",
  "datadog",
  "cloudflare",
  "gitlab",
  "twilio",
  "coinbase",
  "robinhood",
  "airtable",
];

const GREENHOUSE_COMPANY_NAMES: Record<string, string> = {
  groww: "Groww",
  airbnb: "Airbnb",
  dropbox: "Dropbox",
  discord: "Discord",
  datadog: "Datadog",
  cloudflare: "Cloudflare",
  gitlab: "GitLab",
  twilio: "Twilio",
  coinbase: "Coinbase",
  robinhood: "Robinhood",
  airtable: "Airtable",
};

/** Greenhouse Job Board API — public company boards (`?content=true` for richer data). */
export async function fetchGreenhouseJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const board of GREENHOUSE_BOARDS) {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
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
        id?: number;
        title?: string;
        absolute_url?: string;
        location?: { name?: string };
        updated_at?: string;
        first_published?: string;
        content?: string;
        company_name?: string;
        departments?: Array<{ name?: string }>;
        offices?: Array<{ name?: string; location?: string }>;
      }>;
    };

    const company =
      GREENHOUSE_COMPANY_NAMES[board] ||
      board.charAt(0).toUpperCase() + board.slice(1);

    for (const j of json.jobs || []) {
      const apply = (j.absolute_url || "").trim();
      if (!apply || !j.title || seen.has(apply)) continue;
      const depts = (j.departments || [])
        .map((d) => d.name || "")
        .filter(Boolean);
      if (!isTechJob(j.title, depts)) continue;
      seen.add(apply);
      const officeLoc = (j.offices || [])
        .map((o) => o.location || o.name || "")
        .filter(Boolean)
        .join(", ");
      const loc = j.location?.name || officeLoc || "See listing";
      const plain = stripHtml(j.content || "").slice(0, 600);
      const skills = matchSkills(depts, catalog, j.title, plain || loc);
      if (skills.length === 0) continue;
      const india = isIndiaLocation(loc, officeLoc, j.title, plain);
      const brand = (j.company_name || company).trim();
      out.push({
        title: j.title.trim(),
        company: brand,
        type: mapJobType([j.title, ...depts].join(" ")),
        work_mode: /remote/i.test(loc + officeLoc) ? "remote" : "hybrid",
        location: loc,
        skills,
        stipend: null,
        description:
          plain ||
          `${j.title} at ${brand}${depts.length ? ` · ${depts.join(", ")}` : ""} — ${loc}`,
        apply_url: apply,
        source: india ? `${brand} · India` : brand,
        experience_level: /intern/i.test(j.title) ? "internship" : "junior",
        india_focus: india,
        // Prefer first_published (real post date) over updated_at
        posted_at: j.first_published || j.updated_at || null,
      });
    }
  }
  return out;
}

/** Curated Ashby public job boards (no auth). */
const ASHBY_BOARDS = [
  "linear",
  "ramp",
  "notion",
  "openai",
  "supabase",
  "cursor",
  "resend",
  "clerk",
];

/** Ashby Job Board API — public postings. */
export async function fetchAshbyJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const board of ASHBY_BOARDS) {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${board}`,
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
        id?: string;
        title?: string;
        department?: string;
        team?: string;
        employmentType?: string;
        location?: string;
        isRemote?: boolean;
        workplaceType?: string;
        jobUrl?: string;
        publishedAt?: string;
        descriptionPlain?: string;
        descriptionHtml?: string;
      }>;
    };

    const company = board.charAt(0).toUpperCase() + board.slice(1);

    for (const j of json.jobs || []) {
      const apply = (j.jobUrl || "").trim();
      if (!apply || !j.title || seen.has(apply)) continue;
      const tags = [j.department || "", j.team || "", j.employmentType || ""];
      if (!isTechJob(j.title, tags)) continue;
      seen.add(apply);
      const plain = stripHtml(
        j.descriptionPlain || j.descriptionHtml || ""
      ).slice(0, 600);
      const skills = matchSkills(tags, catalog, j.title, plain);
      if (skills.length === 0) continue;
      const loc =
        j.location ||
        (j.isRemote || /remote/i.test(j.workplaceType || "")
          ? "Remote"
          : "See listing");
      const india = isIndiaLocation(loc, j.title, plain);
      out.push({
        title: j.title.trim(),
        company,
        type: mapJobType(j.employmentType || j.title),
        work_mode:
          j.isRemote || /remote/i.test(j.workplaceType || loc)
            ? "remote"
            : "hybrid",
        location: loc,
        skills,
        stipend: null,
        description: plain || `${j.title} at ${company}`,
        apply_url: apply,
        source: india ? "Ashby · India" : "Ashby",
        experience_level: /intern/i.test(j.title) ? "internship" : "junior",
        india_focus: india,
        posted_at: j.publishedAt || null,
      });
    }
  }
  return out;
}

/** Curated Lever public postings (no auth). */
const LEVER_COMPANIES = ["spotify", "palantir", "wealthfront"];

/** Lever Postings API — public company postings. */
export async function fetchLeverJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const companySlug of LEVER_COMPANIES) {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${companySlug}?mode=json`,
      {
        next: { revalidate: 0 },
        headers: {
          Accept: "application/json",
          "User-Agent": "DevCircleJobsBot/1.0",
        },
      }
    );
    if (!res.ok) continue;
    const json = (await res.json()) as Array<{
      id?: string;
      text?: string;
      hostedUrl?: string;
      applyUrl?: string;
      createdAt?: number;
      categories?: {
        location?: string;
        commitment?: string;
        team?: string;
        department?: string;
      };
      descriptionPlain?: string;
      description?: string;
    }>;

    const company =
      companySlug.charAt(0).toUpperCase() + companySlug.slice(1);

    for (const j of json || []) {
      const apply = (j.hostedUrl || j.applyUrl || "").trim();
      if (!apply || !j.text || seen.has(apply)) continue;
      const tags = [
        j.categories?.team || "",
        j.categories?.department || "",
        j.categories?.commitment || "",
      ];
      if (!isTechJob(j.text, tags)) continue;
      seen.add(apply);
      const plain = stripHtml(
        j.descriptionPlain || j.description || ""
      ).slice(0, 600);
      const skills = matchSkills(tags, catalog, j.text, plain);
      if (skills.length === 0) continue;
      const loc = j.categories?.location || "See listing";
      const india = isIndiaLocation(loc, j.text, plain);
      out.push({
        title: j.text.trim(),
        company,
        type: mapJobType(j.categories?.commitment || j.text),
        work_mode: /remote/i.test(loc) ? "remote" : "hybrid",
        location: loc,
        skills,
        stipend: null,
        description: plain || `${j.text} at ${company}`,
        apply_url: apply,
        source: india ? "Lever · India" : "Lever",
        experience_level: /intern/i.test(j.text) ? "internship" : "junior",
        india_focus: india,
        posted_at: j.createdAt
          ? new Date(j.createdAt).toISOString()
          : null,
      });
    }
  }
  return out;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Hacker News "Ask HN: Who is hiring?" via Algolia — latest monthly thread.
 * Parses company comments; skips "who wants to be hired" seeker posts.
 */
export async function fetchHnWhoIsHiringJobs(
  catalog: string[]
): Promise<NormalizedJob[]> {
  const threadsRes = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=12",
    {
      next: { revalidate: 0 },
      headers: {
        Accept: "application/json",
        "User-Agent": "DevCircleJobsBot/1.0",
      },
    }
  );
  if (!threadsRes.ok) throw new Error(`HN Algolia ${threadsRes.status}`);
  const threadsJson = (await threadsRes.json()) as {
    hits?: Array<{ objectID: string; title?: string }>;
  };
  const hiring = (threadsJson.hits || []).find(
    (h) =>
      /Who is hiring/i.test(h.title || "") &&
      !/want|hired/i.test((h.title || "").replace(/Who is hiring/i, ""))
  );
  if (!hiring) return [];

  const commentsRes = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_${hiring.objectID}&hitsPerPage=80`,
    {
      next: { revalidate: 0 },
      headers: {
        Accept: "application/json",
        "User-Agent": "DevCircleJobsBot/1.0",
      },
    }
  );
  if (!commentsRes.ok) return [];
  const commentsJson = (await commentsRes.json()) as {
    hits?: Array<{
      objectID: string;
      author?: string;
      comment_text?: string;
      created_at?: string;
      parent_id?: number;
      story_id?: number;
    }>;
  };

  const out: NormalizedJob[] = [];
  const seen = new Set<string>();

  for (const c of commentsJson.hits || []) {
    // Top-level hiring posts only (parent is the story)
    if (String(c.parent_id) !== hiring.objectID) continue;
    const raw = decodeHtmlEntities(stripHtml(c.comment_text || ""));
    if (!raw || raw.length < 40) continue;
    // Skip job seekers
    if (/willing to relocate|looking for (a )?role|seeking|for hire/i.test(raw))
      continue;
    if (!/https?:\/\//i.test(raw) && !/\|/.test(raw)) continue;

    const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    const company = parts[0].slice(0, 80);
    // Skip if first token looks like a person bio line
    if (/^location:/i.test(company)) continue;

    const urlMatch = raw.match(/https?:\/\/[^\s)]+/i);
    const apply = (
      urlMatch?.[0]?.replace(/[.,;]+$/, "") ||
      `https://news.ycombinator.com/item?id=${c.objectID}`
    ).trim();
    if (seen.has(apply)) continue;
    seen.add(apply);

    const rolePart =
      parts.find((p) =>
        /engineer|developer|designer|intern|fullstack|full.?stack|backend|frontend|devops|sre|product|data|ml|ai|software/i.test(
          p
        )
      ) || parts[1];
    const title = rolePart.slice(0, 120);
    if (!isTechJob(title, parts)) continue;

    const locPart =
      parts.find((p) =>
        /remote|onsite|hybrid|india|bangalore|bengaluru|sf|nyc|london|europe|us\b|worldwide/i.test(
          p
        )
      ) || "Remote / See listing";
    const plain = raw.slice(0, 600);
    const skills = matchSkills(parts, catalog, title, plain);
    if (skills.length === 0) continue;
    const india = isIndiaLocation(locPart, title, plain);

    out.push({
      title: title.trim(),
      company: company.trim() || "Startup",
      type: mapJobType(parts.join(" ")),
      work_mode: /remote/i.test(locPart + raw) ? "remote" : "hybrid",
      location: locPart.slice(0, 80),
      skills,
      stipend: null,
      description: plain,
      apply_url: apply,
      source: india ? "HN Who is Hiring · India" : "HN Who is Hiring",
      experience_level: /intern/i.test(title + raw) ? "internship" : "junior",
      india_focus: india,
      posted_at: c.created_at || null,
    });
  }
  return out;
}
