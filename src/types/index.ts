export type UserRole = "student" | "admin" | "company";
export type OpportunityType = "internship" | "freelance" | "full_time" | "project";
export type WorkMode = "remote" | "onsite" | "hybrid";
export type PostType =
  | "question"
  | "project"
  | "looking_for_teammate"
  | "achievement"
  | "opportunity";
export type LookingFor =
  | "internship"
  | "freelance"
  | "full_time"
  | "open_source"
  | "team_projects";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  college: string | null;
  course: string | null;
  graduation_year: number | null;
  city: string | null;
  bio: string | null;
  headline: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  role: UserRole;
  looking_for: LookingFor[];
  onboarding_complete: boolean;
  is_demo: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skill_id: string | null;
  avatar_url: string | null;
  member_count: number;
  is_demo: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  community_id: string;
  type: PostType;
  content: string;
  /** External job/resource URL (e.g. LinkedIn job post) — tap opens in new tab */
  link_url: string | null;
  like_count: number;
  comment_count: number;
  is_demo: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  tech_stack: string[];
  github_url: string | null;
  live_url: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  type: OpportunityType;
  location: string | null;
  work_mode: WorkMode;
  skills: string[];
  stipend: string | null;
  description: string | null;
  apply_url: string | null;
  source: string | null;
  experience_level: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface TeamRequest {
  id: string;
  author_id: string;
  title: string;
  description: string;
  looking_for_skills: string[];
  is_demo: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

export interface ProfileWithSkills extends Profile {
  skills: Skill[];
}

export const INITIAL_SKILLS = [
  "Swift",
  "SwiftUI",
  "iOS",
  "Android",
  "Flutter",
  "React",
  "React Native",
  "Node.js",
  "MERN",
  "Python",
  "Django",
  "AI / ML",
  "Data Science",
  "Java",
  "Spring Boot",
  "UI/UX",
  "DevOps",
  "Cloud",
  "Cybersecurity",
  "MongoDB",
  "JavaScript",
  "TypeScript",
  "ARKit",
] as const;

export const LOOKING_FOR_OPTIONS: { value: LookingFor; label: string }[] = [
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
  { value: "full_time", label: "Full-time" },
  { value: "open_source", label: "Open Source" },
  { value: "team_projects", label: "Team Projects" },
];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  question: "Question",
  project: "Project",
  looking_for_teammate: "Looking for teammate",
  achievement: "Achievement",
  opportunity: "Opportunity",
};

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  internship: "Internship",
  freelance: "Freelance",
  full_time: "Full-time",
  project: "Project",
};
