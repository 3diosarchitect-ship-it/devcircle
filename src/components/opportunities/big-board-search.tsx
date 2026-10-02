"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bigBoardSearchUrl, type BigBoard } from "@/lib/jobs/big-boards";

const BOARDS: { id: BigBoard; label: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "naukri", label: "Naukri" },
  { id: "indeed", label: "Indeed" },
];

/**
 * Opens LinkedIn / Naukri / Indeed search on their real sites.
 * No scraping — students apply on the genuine platform.
 */
export function BigBoardSearchLinks({
  query,
  location = "India",
  className,
}: {
  query: string;
  location?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs text-muted-foreground">
        Search on genuine boards (opens their site — we don&apos;t scrape):
      </p>
      <div className="flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <Button key={b.id} type="button" variant="outline" size="sm" asChild>
            <a
              href={bigBoardSearchUrl(b.id, query, location)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {b.label}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
