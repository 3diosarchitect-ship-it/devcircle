import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[/&]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/** Absolute date for "Posted on" (e.g. 2 Oct 2026, 12:40) */
export function formatPostedOn(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isValidGithubUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const u = new URL(url);
    return (
      (u.hostname === "github.com" || u.hostname === "www.github.com") &&
      u.pathname.split("/").filter(Boolean).length >= 1
    );
  } catch {
    return false;
  }
}

export function isValidUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isLinkedInUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
}

import { detectJobBoard, jobBoardLabel } from "@/lib/jobs/big-boards";

/** CTA label when opening an external apply / job link */
export function applyLinkLabel(url: string | null | undefined): string {
  const board = detectJobBoard(url);
  const name = jobBoardLabel(board);
  if (name) return `Open on ${name}`;
  if (url && /github\.com/i.test(url)) return "View on GitHub";
  if (url?.trim()) return "Open job link";
  return "Apply";
}

export function isGithubIssueUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      (u.hostname === "github.com" || u.hostname === "www.github.com") &&
      u.pathname.includes("/issues/")
    );
  } catch {
    return false;
  }
}

export function isOpenSourceListing(opp: {
  title?: string | null;
  source?: string | null;
  apply_url?: string | null;
  type?: string | null;
}): boolean {
  if (opp.type === "project") return true;
  if ((opp.title || "").startsWith("[OSS]")) return true;
  if ((opp.source || "").toLowerCase().includes("open source")) return true;
  return isGithubIssueUrl(opp.apply_url);
}

export function profileCompletion(profile: {
  full_name?: string | null;
  bio?: string | null;
  college?: string | null;
  avatar_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  city?: string | null;
  course?: string | null;
}): { percent: number; missing: string[] } {
  const checks: { key: string; label: string; ok: boolean }[] = [
    { key: "full_name", label: "Full name", ok: !!profile.full_name },
    { key: "bio", label: "Bio", ok: !!profile.bio },
    { key: "college", label: "College", ok: !!profile.college },
    { key: "course", label: "Course", ok: !!profile.course },
    { key: "city", label: "City", ok: !!profile.city },
    { key: "avatar_url", label: "Photo", ok: !!profile.avatar_url },
    { key: "github_url", label: "GitHub", ok: !!profile.github_url },
    { key: "linkedin_url", label: "LinkedIn", ok: !!profile.linkedin_url },
    { key: "portfolio_url", label: "Portfolio", ok: !!profile.portfolio_url },
  ];
  const done = checks.filter((c) => c.ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

export function usernameFromName(name: string): string {
  return (
    slugify(name).replace(/-/g, "") ||
    `dev${Math.random().toString(36).slice(2, 8)}`
  );
}
