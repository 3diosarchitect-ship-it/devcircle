import type {
  LookingFor,
  MatchResult,
  Opportunity,
  OpportunityType,
  WorkMode,
} from "@/types";

/** Related skill mappings for soft matches */
const RELATED_SKILLS: Record<string, string[]> = {
  react: ["javascript", "typescript", "mern", "next.js", "frontend"],
  "node.js": ["javascript", "typescript", "mern", "express", "backend"],
  mern: ["react", "node.js", "mongodb", "javascript", "express"],
  python: ["django", "ai / ml", "data science", "flask"],
  "ai / ml": ["python", "data science", "machine learning"],
  "data science": ["python", "ai / ml"],
  ios: ["swift", "swiftui", "arkit"],
  swift: ["ios", "swiftui"],
  swiftui: ["ios", "swift"],
  flutter: ["dart", "mobile", "android", "ios"],
  android: ["kotlin", "java", "flutter"],
  javascript: ["react", "node.js", "typescript", "mern"],
  typescript: ["javascript", "react", "node.js"],
  django: ["python"],
  java: ["spring boot", "android"],
  "spring boot": ["java"],
  "ui/ux": ["figma", "design"],
  devops: ["cloud", "docker", "kubernetes"],
  cloud: ["devops", "aws", "azure"],
  mongodb: ["mern", "node.js"],
  arkit: ["ios", "swift", "ar / spatial computing"],
};

const LOOKING_TO_OPP: Record<LookingFor, OpportunityType[]> = {
  internship: ["internship"],
  freelance: ["freelance", "project"],
  full_time: ["full_time"],
  open_source: ["project"],
  team_projects: ["project"],
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Deterministic match score:
 * Skills 50% + Type 25% + Location/remote 15% + Experience/level 10%
 */
export function calculateMatchScore(
  student: {
    skills: string[];
    looking_for: LookingFor[];
    city?: string | null;
  },
  opportunity: Pick<
    Opportunity,
    "skills" | "type" | "work_mode" | "location" | "experience_level"
  >
): MatchResult {
  const reasons: string[] = [];
  const studentSkills = student.skills.map(norm);
  const oppSkills = (opportunity.skills || []).map(norm);

  // --- Skills (50%) ---
  let skillScore = 0;
  if (oppSkills.length === 0) {
    skillScore = 0.3;
  } else {
    let exact = 0;
    let related = 0;
    const matchedExact = new Set<string>();
    const matchedRelated = new Set<string>();

    for (const os of oppSkills) {
      if (studentSkills.includes(os)) {
        exact++;
        matchedExact.add(os);
        continue;
      }
      for (const ss of studentSkills) {
        const relatedList = RELATED_SKILLS[ss] || [];
        const reverseRelated = RELATED_SKILLS[os] || [];
        if (relatedList.includes(os) || reverseRelated.includes(ss)) {
          related++;
          matchedRelated.add(os);
          break;
        }
      }
    }

    skillScore = Math.min(1, (exact * 1 + related * 0.5) / oppSkills.length);

    for (const s of matchedExact) {
      const label = opportunity.skills.find((x) => norm(x) === s) || s;
      reasons.push(`${label} matches`);
    }
    for (const s of matchedRelated) {
      if (matchedExact.has(s)) continue;
      const label = opportunity.skills.find((x) => norm(x) === s) || s;
      reasons.push(`${label} is related to your skill set`);
    }
  }

  // --- Type (25%) ---
  let typeScore = 0;
  const looking = student.looking_for || [];
  if (looking.length === 0) {
    typeScore = 0.4;
  } else {
    const matchesType = looking.some((lf) =>
      (LOOKING_TO_OPP[lf] || []).includes(opportunity.type)
    );
    if (matchesType) {
      typeScore = 1;
      const labels: Record<OpportunityType, string> = {
        internship: "Internship",
        freelance: "Freelance",
        full_time: "Full-time",
        project: "Project",
      };
      reasons.push(`${labels[opportunity.type]} matches`);
    } else {
      typeScore = 0.15;
    }
  }

  // --- Location / remote (15%) ---
  let locationScore = 0.4;
  const mode: WorkMode = opportunity.work_mode;
  if (mode === "remote") {
    locationScore = 1;
    reasons.push("Remote opportunity");
  } else if (
    student.city &&
    opportunity.location &&
    norm(opportunity.location).includes(norm(student.city))
  ) {
    locationScore = 1;
    reasons.push(`Location matches (${student.city})`);
  } else if (mode === "hybrid") {
    locationScore = 0.6;
    reasons.push("Hybrid opportunity");
  }

  // --- Experience / level (10%) ---
  let levelScore = 0.7;
  const level = norm(opportunity.experience_level || "");
  if (
    level.includes("intern") ||
    level.includes("junior") ||
    level.includes("entry") ||
    opportunity.type === "internship" ||
    opportunity.type === "project"
  ) {
    levelScore = 1;
    reasons.push("Suitable for student / junior level");
  } else if (level.includes("mid") || level.includes("senior")) {
    levelScore = 0.35;
  }

  const score = Math.round(
    skillScore * 50 + typeScore * 25 + locationScore * 15 + levelScore * 10
  );

  // Ensure at least a couple of reasons for any decent match
  if (reasons.length === 0 && score > 20) {
    reasons.push("Partially aligned with your profile");
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

export function communityNameFromSkill(skillName: string): string {
  const special: Record<string, string> = {
    "AI / ML": "AI & ML Developers",
    "UI/UX": "UI/UX Designers",
    ARKit: "AR / Spatial Computing",
    DevOps: "DevOps Developers",
    "Data Science": "Data Science Developers",
    MERN: "MERN Developers",
    iOS: "iOS Developers",
    Android: "Android Developers",
    Flutter: "Flutter Developers",
    React: "React Developers",
    Python: "Python Developers",
    Cybersecurity: "Cybersecurity Developers",
    Cloud: "Cloud Developers",
  };
  if (special[skillName]) return special[skillName];
  return `${skillName} Developers`;
}
