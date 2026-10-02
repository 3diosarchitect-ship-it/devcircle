/**
 * LinkedIn / Naukri / Indeed have no self-serve job-search APIs for student apps.
 * We never scrape them. Instead:
 * 1) Students/admins paste a real job URL → we store + open it on tap
 * 2) Deep-links open the platform's own search (user stays on genuine site)
 */

export type BigBoard = "linkedin" | "naukri" | "indeed";

export function detectJobBoard(url: string | null | undefined): BigBoard | null {
  if (!url?.trim()) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("naukri.com") || host.includes("naukrigulf.com")) return "naukri";
    if (host.includes("indeed.com") || host.includes("indeed.co.in")) return "indeed";
    return null;
  } catch {
    return null;
  }
}

export function jobBoardLabel(board: BigBoard | null): string | null {
  if (!board) return null;
  const labels: Record<BigBoard, string> = {
    linkedin: "LinkedIn",
    naukri: "Naukri",
    indeed: "Indeed",
  };
  return labels[board];
}

/** Open platform search in a new tab — no data pulled into DevCircle. */
export function bigBoardSearchUrl(
  board: BigBoard,
  query: string,
  location = "India"
): string {
  const raw = (query.trim() || "software developer").toLowerCase();
  const q = encodeURIComponent(raw);
  const loc = encodeURIComponent(location.trim() || "India");
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const locSlug = (location.trim() || "India")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  switch (board) {
    case "linkedin":
      return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
    case "naukri":
      return `https://www.naukri.com/${slug}-jobs-in-${locSlug}`;
    case "indeed":
      return `https://in.indeed.com/jobs?q=${q}&l=${loc}`;
  }
}
