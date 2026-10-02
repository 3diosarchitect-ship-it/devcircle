/** Jobs older than this are not ingested, shown, or kept in the DB. */
export const JOB_RETENTION_DAYS = 20;

export function jobRetentionCutoff(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - JOB_RETENTION_DAYS);
  return d;
}

export function jobRetentionCutoffIso(now = new Date()): string {
  return jobRetentionCutoff(now).toISOString();
}

/**
 * True if the portal listing date is within the retention window.
 * Missing / unparseable dates are treated as fresh (we expire them via DB created_at).
 */
export function isFreshPortalDate(
  postedAt?: string | Date | null,
  now = new Date()
): boolean {
  if (postedAt == null || postedAt === "") return true;
  const d = postedAt instanceof Date ? postedAt : new Date(postedAt);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() >= jobRetentionCutoff(now).getTime();
}

/** Parse "Posted by Himalayas on 14 Sep 2026" from job description. */
export function parsePostedByDate(
  description?: string | null
): Date | null {
  if (!description) return null;
  const m = description.match(
    /Posted by .+ on (\d{1,2} [A-Za-z]{3,4} \d{4})\s*$/m
  );
  if (!m?.[1]) return null;
  // Normalize "Sept" → "Sep" so Date parsing is consistent
  const normalized = m[1].replace(/\bSept\b/i, "Sep");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Keep only jobs saved in the last 20 days, and whose portal date
 * (when present in the description) is also within 20 days.
 */
export function isFreshStoredOpportunity(opp: {
  created_at?: string | null;
  description?: string | null;
}): boolean {
  if (!isFreshPortalDate(opp.created_at)) return false;
  const portal = parsePostedByDate(opp.description);
  if (portal && !isFreshPortalDate(portal)) return false;
  return true;
}
