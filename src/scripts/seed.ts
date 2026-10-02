/**
 * DevCircle seed data
 * Run: npx tsx src/scripts/seed.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { communityNameFromSkill } from "../lib/matching";
import { slugify } from "../lib/utils";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SKILLS = [
  { name: "Swift", category: "mobile" },
  { name: "SwiftUI", category: "mobile" },
  { name: "iOS", category: "mobile" },
  { name: "Android", category: "mobile" },
  { name: "Flutter", category: "mobile" },
  { name: "React", category: "web" },
  { name: "React Native", category: "mobile" },
  { name: "Node.js", category: "backend" },
  { name: "MERN", category: "web" },
  { name: "Python", category: "backend" },
  { name: "Django", category: "backend" },
  { name: "AI / ML", category: "ai" },
  { name: "Data Science", category: "ai" },
  { name: "Java", category: "backend" },
  { name: "Spring Boot", category: "backend" },
  { name: "UI/UX", category: "design" },
  { name: "DevOps", category: "infra" },
  { name: "Cloud", category: "infra" },
  { name: "Cybersecurity", category: "security" },
  { name: "MongoDB", category: "backend" },
  { name: "JavaScript", category: "web" },
  { name: "TypeScript", category: "web" },
  { name: "ARKit", category: "mobile" },
];

const DEMO_STUDENTS = [
  {
    email: "rahul@devcircle.demo",
    password: "demo123456",
    full_name: "Rahul Sharma",
    username: "rahulsharma",
    college: "IIT Delhi",
    course: "B.Tech CSE",
    graduation_year: 2026,
    city: "Delhi",
    bio: "Building web products and exploring AI. Looking for internships and team projects.",
    headline: "MERN Developer",
    github_url: "https://github.com/octocat",
    linkedin_url: "https://linkedin.com/in/demo",
    skills: ["React", "Node.js", "MERN", "MongoDB", "JavaScript"],
    looking_for: ["internship", "freelance", "team_projects"],
  },
  {
    email: "priya@devcircle.demo",
    password: "demo123456",
    full_name: "Priya Patel",
    username: "priyapatel",
    college: "NIT Trichy",
    course: "B.Tech IT",
    graduation_year: 2027,
    city: "Chennai",
    bio: "iOS enthusiast. Love SwiftUI and shipping polished mobile apps.",
    headline: "iOS Developer",
    github_url: "https://github.com/octocat",
    skills: ["iOS", "Swift", "SwiftUI", "ARKit"],
    looking_for: ["internship", "team_projects"],
  },
  {
    email: "arjun@devcircle.demo",
    password: "demo123456",
    full_name: "Arjun Mehta",
    username: "arjunmehta",
    college: "BITS Pilani",
    course: "B.E. Computer Science",
    graduation_year: 2025,
    city: "Bangalore",
    bio: "Flutter + Firebase. Building cross-platform apps for college startups.",
    headline: "Flutter Developer",
    github_url: "https://github.com/octocat",
    skills: ["Flutter", "Android", "UI/UX"],
    looking_for: ["internship", "freelance", "full_time"],
  },
  {
    email: "sara@devcircle.demo",
    password: "demo123456",
    full_name: "Sara Khan",
    username: "sarakhan",
    college: "IIIT Hyderabad",
    course: "B.Tech CSE",
    graduation_year: 2026,
    city: "Hyderabad",
    bio: "ML engineer in training. Working on NLP and computer vision projects.",
    headline: "AI / ML Developer",
    github_url: "https://github.com/octocat",
    skills: ["AI / ML", "Python", "Data Science"],
    looking_for: ["internship", "open_source"],
  },
  {
    email: "vikram@devcircle.demo",
    password: "demo123456",
    full_name: "Vikram Singh",
    username: "vikramsingh",
    college: "DTU",
    course: "B.Tech Software Engineering",
    graduation_year: 2025,
    city: "Delhi",
    bio: "Backend-focused. Python, Django, and cloud deployments.",
    headline: "Python Developer",
    skills: ["Python", "Django", "Cloud", "DevOps"],
    looking_for: ["internship", "full_time"],
  },
  {
    email: "ananya@devcircle.demo",
    password: "demo123456",
    full_name: "Ananya Reddy",
    username: "ananyareddy",
    college: "VIT Vellore",
    course: "B.Des",
    graduation_year: 2026,
    city: "Bangalore",
    bio: "Product designer who codes. Figma to React handoff specialist.",
    headline: "UI/UX Designer",
    portfolio_url: "https://example.com",
    skills: ["UI/UX", "React", "JavaScript"],
    looking_for: ["internship", "freelance"],
  },
  {
    email: "kabir@devcircle.demo",
    password: "demo123456",
    full_name: "Kabir Joshi",
    username: "kabirjoshi",
    college: "COEP Pune",
    course: "B.Tech CSE",
    graduation_year: 2027,
    city: "Pune",
    bio: "Full-stack MERN. Shipping side projects every month.",
    headline: "Full Stack Developer",
    github_url: "https://github.com/octocat",
    skills: ["MERN", "React", "Node.js", "MongoDB", "TypeScript"],
    looking_for: ["internship", "team_projects", "freelance"],
  },
  {
    email: "meera@devcircle.demo",
    password: "demo123456",
    full_name: "Meera Iyer",
    username: "meeraiyer",
    college: "Anna University",
    course: "B.E. ECE",
    graduation_year: 2026,
    city: "Chennai",
    bio: "Android + Kotlin. Exploring Jetpack Compose.",
    headline: "Android Developer",
    skills: ["Android", "Java", "Flutter"],
    looking_for: ["internship", "open_source"],
  },
  {
    email: "rohan@devcircle.demo",
    password: "demo123456",
    full_name: "Rohan Gupta",
    username: "rohangupta",
    college: "NSIT Delhi",
    course: "B.Tech IT",
    graduation_year: 2025,
    city: "Noida",
    bio: "Java Spring Boot microservices. Interested in DevOps too.",
    headline: "Backend Developer",
    skills: ["Java", "Spring Boot", "DevOps", "Cloud"],
    looking_for: ["full_time", "internship"],
  },
  {
    email: "isha@devcircle.demo",
    password: "demo123456",
    full_name: "Isha Verma",
    username: "ishaverma",
    college: "Manipal Institute of Technology",
    course: "B.Tech CSE",
    graduation_year: 2027,
    city: "Manipal",
    bio: "React Native + TypeScript. Building campus community apps.",
    headline: "React Native Developer",
    github_url: "https://github.com/octocat",
    skills: ["React Native", "React", "TypeScript", "Node.js"],
    looking_for: ["internship", "team_projects"],
  },
];

const OPPORTUNITIES = [
  {
    title: "React Intern",
    company: "NovaLabs (Demo)",
    type: "internship",
    location: "Bangalore",
    work_mode: "hybrid",
    skills: ["React", "JavaScript", "TypeScript"],
    stipend: "₹25,000/mo",
    description: "Work on customer-facing dashboards with a small product team. Demo opportunity for DevCircle.",
    experience_level: "internship",
  },
  {
    title: "iOS Developer Intern",
    company: "AppleTree Studios (Demo)",
    type: "internship",
    location: "Remote",
    work_mode: "remote",
    skills: ["iOS", "Swift", "SwiftUI"],
    stipend: "₹30,000/mo",
    description: "Ship features for a consumer iOS app using SwiftUI. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Flutter Developer Intern",
    company: "PixelCraft (Demo)",
    type: "internship",
    location: "Pune",
    work_mode: "onsite",
    skills: ["Flutter", "UI/UX"],
    stipend: "₹20,000/mo",
    description: "Build cross-platform mobile features for an edtech product. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Python Developer Intern",
    company: "DataNest (Demo)",
    type: "internship",
    location: "Remote",
    work_mode: "remote",
    skills: ["Python", "Django"],
    stipend: "₹22,000/mo",
    description: "APIs and internal tools with Django REST Framework. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "AI/ML Intern",
    company: "InsightAI (Demo)",
    type: "internship",
    location: "Hyderabad",
    work_mode: "hybrid",
    skills: ["AI / ML", "Python", "Data Science"],
    stipend: "₹35,000/mo",
    description: "Assist with model training pipelines and evaluation notebooks. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "MERN Developer Intern",
    company: "StackCurrents (Demo)",
    type: "internship",
    location: "Delhi",
    work_mode: "hybrid",
    skills: ["MERN", "React", "Node.js", "MongoDB"],
    stipend: "₹28,000/mo",
    description: "Full-stack features across React and Node. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Junior Backend Developer",
    company: "CloudShelf (Demo)",
    type: "full_time",
    location: "Bangalore",
    work_mode: "hybrid",
    skills: ["Node.js", "Java", "Cloud"],
    stipend: "₹8–12 LPA",
    description: "Entry-level backend role. Demo opportunity — not a real vacancy.",
    experience_level: "junior",
  },
  {
    title: "UI/UX Intern",
    company: "Form&Function (Demo)",
    type: "internship",
    location: "Remote",
    work_mode: "remote",
    skills: ["UI/UX", "React"],
    stipend: "₹18,000/mo",
    description: "Design and prototype product flows. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Freelance React Dashboard",
    company: "CampusOps (Demo)",
    type: "freelance",
    location: "Remote",
    work_mode: "remote",
    skills: ["React", "TypeScript", "UI/UX"],
    stipend: "₹40,000 fixed",
    description: "Build an admin dashboard for a college society. Demo freelance project.",
    experience_level: "junior",
  },
  {
    title: "Flutter App Development Project",
    company: "LocalEats (Demo)",
    type: "project",
    location: "Remote",
    work_mode: "remote",
    skills: ["Flutter", "Firebase"],
    stipend: "Equity + stipend",
    description: "Student startup looking for Flutter help. Demo project.",
    experience_level: "internship",
  },
  {
    title: "DevOps Intern",
    company: "ShipFast Infra (Demo)",
    type: "internship",
    location: "Remote",
    work_mode: "remote",
    skills: ["DevOps", "Cloud"],
    stipend: "₹25,000/mo",
    description: "CI/CD pipelines and cloud deployments. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Android Developer Intern",
    company: "Mobiquity Labs (Demo)",
    type: "internship",
    location: "Chennai",
    work_mode: "onsite",
    skills: ["Android", "Java"],
    stipend: "₹20,000/mo",
    description: "Feature work on a Kotlin Android app. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Open Source: React Component Library",
    company: "Community (Demo)",
    type: "project",
    location: "Remote",
    work_mode: "remote",
    skills: ["React", "TypeScript"],
    stipend: "Unpaid / OSS",
    description: "Contribute to a student-led component library. Demo project.",
    experience_level: "internship",
  },
  {
    title: "Spring Boot Intern",
    company: "FinLedger (Demo)",
    type: "internship",
    location: "Noida",
    work_mode: "hybrid",
    skills: ["Java", "Spring Boot"],
    stipend: "₹30,000/mo",
    description: "Microservices for a fintech demo product. Demo opportunity.",
    experience_level: "internship",
  },
  {
    title: "Cybersecurity Intern",
    company: "ShieldOps (Demo)",
    type: "internship",
    location: "Remote",
    work_mode: "remote",
    skills: ["Cybersecurity", "Cloud"],
    stipend: "₹22,000/mo",
    description: "Security reviews and vulnerability reports. Demo opportunity.",
    experience_level: "internship",
  },
];

async function ensureSkill(name: string, category: string) {
  const slug = slugify(name);
  const { data } = await supabase
    .from("skills")
    .upsert({ name, slug, category }, { onConflict: "slug" })
    .select("*")
    .single();
  return data;
}

async function ensureCommunity(skill: { id: string; name: string }) {
  const name = communityNameFromSkill(skill.name);
  const slug = slugify(name);
  const { data } = await supabase
    .from("communities")
    .upsert(
      {
        name,
        slug,
        skill_id: skill.id,
        description: `A community for developers building with ${skill.name}. Share projects, ask questions, find teammates, and discover opportunities.`,
        is_demo: true,
      },
      { onConflict: "slug" }
    )
    .select("*")
    .single();
  return data;
}

async function upsertDemoUser(student: (typeof DEMO_STUDENTS)[0]) {
  // Try to find existing user by listing (service role)
  const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let userId = listed?.users?.find((u) => u.email === student.email)?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: student.email,
      password: student.password,
      email_confirm: true,
      user_metadata: {
        full_name: student.full_name,
        username: student.username,
      },
    });
    if (error) throw error;
    userId = data.user!.id;
  }

  await supabase
    .from("profiles")
    .update({
      username: student.username,
      full_name: student.full_name,
      college: student.college,
      course: student.course,
      graduation_year: student.graduation_year,
      city: student.city,
      bio: student.bio,
      headline: student.headline,
      github_url: student.github_url || null,
      linkedin_url: student.linkedin_url || null,
      portfolio_url: student.portfolio_url || null,
      looking_for: student.looking_for,
      onboarding_complete: true,
      is_demo: true,
      avatar_url: `https://api.dicebear.com/9.x/shapes/svg?seed=${student.username}`,
    })
    .eq("id", userId);

  return userId!;
}

async function main() {
  console.log("🌱 Seeding DevCircle...\n");

  // Skills
  const skillMap = new Map<string, { id: string; name: string }>();
  for (const s of SKILLS) {
    const row = await ensureSkill(s.name, s.category);
    if (row) skillMap.set(s.name, row);
    process.stdout.write(`  skill: ${s.name}\n`);
  }

  // Core communities
  const communityMap = new Map<string, { id: string; name: string; slug: string }>();
  const coreCommunitySkills = [
    "iOS",
    "Android",
    "Flutter",
    "React",
    "MERN",
    "Python",
    "AI / ML",
    "Data Science",
    "UI/UX",
    "DevOps",
  ];
  for (const name of coreCommunitySkills) {
    const skill = skillMap.get(name);
    if (!skill) continue;
    const c = await ensureCommunity(skill);
    if (c) communityMap.set(name, c);
    console.log(`  community: ${c?.name}`);
  }

  // Also ensure communities for all skills
  for (const [, skill] of skillMap) {
    const c = await ensureCommunity(skill);
    if (c) communityMap.set(skill.name, c);
  }

  // Opportunities
  await supabase.from("opportunities").delete().eq("is_demo", true);
  const { data: opps, error: oppErr } = await supabase
    .from("opportunities")
    .insert(
      OPPORTUNITIES.map((o) => ({
        ...o,
        source: "Demo Opportunity",
        is_demo: true,
        apply_url: "https://example.com/apply",
      }))
    )
    .select("id, title");
  if (oppErr) throw oppErr;
  console.log(`\n  opportunities: ${opps?.length}`);

  // Students
  const profileIds: { id: string; username: string; skills: string[] }[] = [];
  for (const student of DEMO_STUDENTS) {
    const id = await upsertDemoUser(student);
    profileIds.push({ id, username: student.username, skills: student.skills });

    // skills
    await supabase.from("profile_skills").delete().eq("profile_id", id);
    const skillRows = student.skills
      .map((n) => skillMap.get(n))
      .filter(Boolean)
      .map((s) => ({ profile_id: id, skill_id: s!.id }));
    if (skillRows.length) {
      await supabase.from("profile_skills").insert(skillRows);
    }

    // communities
    for (const skillName of student.skills) {
      const c = communityMap.get(skillName);
      if (!c) continue;
      await supabase.from("community_members").upsert({
        community_id: c.id,
        profile_id: id,
      });
    }

    console.log(`  student: ${student.full_name} (${student.email})`);
  }

  // Projects
  await supabase.from("projects").delete().eq("is_demo", true);
  const projects = [
    {
      username: "rahulsharma",
      name: "CampusConnect",
      description: "A MERN app for college club discovery and event RSVPs.",
      tech_stack: ["React", "Node.js", "MongoDB"],
      github_url: "https://github.com/octocat/Hello-World",
      live_url: "https://example.com",
    },
    {
      username: "rahulsharma",
      name: "DevResume AI",
      description: "AI-assisted resume bullet rewriter for students.",
      tech_stack: ["React", "Python"],
      github_url: "https://github.com/octocat/Spoon-Knife",
    },
    {
      username: "priyapatel",
      name: "SwiftHabit",
      description: "Habit tracker built with SwiftUI and SwiftData.",
      tech_stack: ["Swift", "SwiftUI", "iOS"],
      github_url: "https://github.com/octocat/Hello-World",
    },
    {
      username: "arjunmehta",
      name: "FoodFindr",
      description: "Flutter app to find cheap eats near campus.",
      tech_stack: ["Flutter", "Firebase"],
      github_url: "https://github.com/octocat/Hello-World",
    },
    {
      username: "sarakhan",
      name: "ResumeRanker",
      description: "ML model that ranks resumes against a job description.",
      tech_stack: ["Python", "AI / ML"],
      github_url: "https://github.com/octocat/Hello-World",
    },
    {
      username: "kabirjoshi",
      name: "TaskOrbit",
      description: "Realtime collaborative todo board for student teams.",
      tech_stack: ["MERN", "TypeScript"],
      github_url: "https://github.com/octocat/Hello-World",
    },
    {
      username: "ananyareddy",
      name: "DesignOps Kit",
      description: "Component design system for student products.",
      tech_stack: ["UI/UX", "React"],
      live_url: "https://example.com",
    },
    {
      username: "vikramsingh",
      name: "PyDeployer",
      description: "CLI to deploy Django apps to a VPS with Docker.",
      tech_stack: ["Python", "Django", "DevOps"],
      github_url: "https://github.com/octocat/Hello-World",
    },
  ];

  for (const p of projects) {
    const profile = profileIds.find((x) => x.username === p.username);
    if (!profile) continue;
    await supabase.from("projects").insert({
      profile_id: profile.id,
      name: p.name,
      description: p.description,
      tech_stack: p.tech_stack,
      github_url: p.github_url || null,
      live_url: p.live_url || null,
      is_demo: true,
    });
  }
  console.log(`  projects: ${projects.length}`);

  // Posts
  await supabase.from("posts").delete().eq("is_demo", true);
  const postSeeds = [
    { skill: "React", author: "rahulsharma", type: "question", content: "What's the best way to structure a large React app for a college hackathon?" },
    { skill: "React", author: "kabirjoshi", type: "project", content: "Just shipped TaskOrbit — a realtime todo board. Feedback welcome!" },
    { skill: "React", author: "ananyareddy", type: "looking_for_teammate", content: "Looking for a React developer for my college design-system project." },
    { skill: "iOS", author: "priyapatel", type: "achievement", content: "Shipped SwiftHabit to TestFlight 🚀" },
    { skill: "iOS", author: "priyapatel", type: "question", content: "SwiftUI vs UIKit for a new campus app — what would you pick in 2026?" },
    { skill: "Flutter", author: "arjunmehta", type: "looking_for_teammate", content: "Looking for a Flutter developer for my college project — food delivery MVP." },
    { skill: "Flutter", author: "meeraiyer", type: "project", content: "Working on a Jetpack Compose + Flutter comparison write-up." },
    { skill: "MERN", author: "rahulsharma", type: "opportunity", content: "Our club needs a MERN volunteer for the fest website. DM me!" },
    { skill: "MERN", author: "kabirjoshi", type: "question", content: "MongoDB aggregation tips for analytics dashboards?" },
    { skill: "Python", author: "vikramsingh", type: "project", content: "Open-sourced PyDeployer — Docker deploy helper for Django." },
    { skill: "Python", author: "sarakhan", type: "question", content: "Best datasets for a beginner NLP resume-ranking project?" },
    { skill: "AI / ML", author: "sarakhan", type: "looking_for_teammate", content: "Looking for a frontend person for my AI Resume Analyzer." },
    { skill: "AI / ML", author: "sarakhan", type: "achievement", content: "Hit 82% F1 on my resume ranking model 🎉" },
    { skill: "Data Science", author: "sarakhan", type: "project", content: "Sharing a notebook on EDA for campus placement data." },
    { skill: "UI/UX", author: "ananyareddy", type: "project", content: "Posted a new case study: redesigning our college ERP attendance flow." },
    { skill: "UI/UX", author: "ananyareddy", type: "question", content: "How do you run usability tests with classmates on a budget?" },
    { skill: "DevOps", author: "vikramsingh", type: "question", content: "GitHub Actions vs GitLab CI for student projects?" },
    { skill: "DevOps", author: "rohangupta", type: "project", content: "Set up a starter Terraform template for AWS free tier." },
    { skill: "Android", author: "meeraiyer", type: "looking_for_teammate", content: "Need a backend buddy for my Android campus navigation app." },
    { skill: "Node.js", author: "ishaverma", type: "question", content: "How are you structuring Express folders in 2026?" },
    { skill: "React Native", author: "ishaverma", type: "project", content: "Building a campus community RN app — early screens attached in repo." },
  ];

  let postCount = 0;
  for (const p of postSeeds) {
    const community = communityMap.get(p.skill);
    const author = profileIds.find((x) => x.username === p.author);
    if (!community || !author) continue;
    await supabase.from("posts").insert({
      author_id: author.id,
      community_id: community.id,
      type: p.type,
      content: p.content,
      is_demo: true,
    });
    postCount++;
  }
  console.log(`  posts: ${postCount}`);

  // Team requests
  await supabase.from("team_requests").delete().eq("is_demo", true);
  const rahul = profileIds.find((x) => x.username === "rahulsharma");
  const sara = profileIds.find((x) => x.username === "sarakhan");
  if (rahul) {
    await supabase.from("team_requests").insert({
      author_id: rahul.id,
      title: "AI Resume Analyzer",
      description:
        "I am building an AI resume analyzer and need help with frontend.",
      looking_for_skills: ["React", "Python", "UI/UX"],
      is_demo: true,
    });
  }
  if (sara) {
    await supabase.from("team_requests").insert({
      author_id: sara.id,
      title: "Campus Placement Predictor",
      description: "Need a React developer to visualize ML model outputs.",
      looking_for_skills: ["React", "Data Science"],
      is_demo: true,
    });
  }

  // Admin user
  const adminEmail = "admin@devcircle.demo";
  const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let adminId = listed?.users?.find((u) => u.email === adminEmail)?.id;
  if (!adminId) {
    const { data } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: "demo123456",
      email_confirm: true,
      user_metadata: { full_name: "DevCircle Admin", username: "admin" },
    });
    adminId = data.user?.id;
  }
  if (adminId) {
    await supabase
      .from("profiles")
      .update({
        full_name: "DevCircle Admin",
        username: "admin",
        is_admin: true,
        onboarding_complete: true,
        is_demo: true,
        headline: "Platform Admin",
        bio: "Demo admin account for DevCircle.",
      })
      .eq("id", adminId);
  }

  // Sample notifications for rahul
  if (rahul) {
    await supabase.from("notifications").delete().eq("profile_id", rahul.id);
    await supabase.from("notifications").insert([
      {
        profile_id: rahul.id,
        title: "You were added to React Developers",
        body: "Based on your skills, you automatically joined this community.",
        link: "/communities/react-developers",
      },
      {
        profile_id: rahul.id,
        title: "New React internship matches your profile",
        body: "React Intern at NovaLabs (Demo) looks like a strong match.",
        link: "/opportunities",
      },
      {
        profile_id: rahul.id,
        title: "Kabir posted in MERN Developers",
        body: "Just shipped TaskOrbit — a realtime todo board.",
        link: "/communities/mern-developers",
      },
    ]);
  }

  console.log("\n✅ Seed complete!");
  console.log("\nDemo logins (password: demo123456):");
  console.log("  rahul@devcircle.demo  (student)");
  console.log("  priya@devcircle.demo  (iOS)");
  console.log("  admin@devcircle.demo  (admin)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
