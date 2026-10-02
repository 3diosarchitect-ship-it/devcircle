"use client";

import { Link2 } from "lucide-react";

/**
 * LinkedIn profile link on the student profile.
 * Job sharing = paste LinkedIn job URL on opportunities / community posts
 * (tap opens LinkedIn). No scraping.
 */
export function LinkedInCard({ linkedinUrl }: { linkedinUrl?: string | null }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Link2 className="size-4 text-primary" />
        <h3 className="font-medium">LinkedIn</h3>
      </div>
      {linkedinUrl ? (
        <p className="text-sm text-muted-foreground">
          Profile linked:{" "}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {linkedinUrl}
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          LinkedIn not added yet. Paste your profile URL in Settings.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Jobs: paste a LinkedIn job URL in Admin → Create opportunity, or in a
        community post (type Opportunity). Tap opens LinkedIn with full
        details — we never scrape LinkedIn.
      </p>
    </div>
  );
}
