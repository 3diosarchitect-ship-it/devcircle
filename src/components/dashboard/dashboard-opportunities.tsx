"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Opportunity } from "@/types";

export function DashboardOpportunities({
  items,
  savedIds,
}: {
  items: {
    opportunity: Opportunity;
    matchScore: number;
    matchReasons: string[];
  }[];
  savedIds: string[];
}) {
  const [saved, setSaved] = useState(new Set(savedIds));
  const [, startTransition] = useTransition();

  function toggleSave(id: string) {
    const isSaved = saved.has(id);
    startTransition(async () => {
      try {
        if (isSaved) {
          await fetch(
            `/api/opportunities/save?opportunity_id=${encodeURIComponent(id)}`,
            { method: "DELETE" }
          );
          setSaved((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
        } else {
          await fetch("/api/opportunities/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opportunity_id: id }),
          });
          setSaved((p) => new Set(p).add(id));
        }
      } catch {
        toast.error("Could not save");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ opportunity, matchScore, matchReasons }) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            matchScore={matchScore}
            matchReasons={matchReasons}
            saved={saved.has(opportunity.id)}
            onSave={() => toggleSave(opportunity.id)}
            onApply={() => {
              if (opportunity.apply_url) {
                window.open(opportunity.apply_url, "_blank", "noopener,noreferrer");
              }
            }}
          />
        ))}
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/opportunities">View all opportunities</Link>
      </Button>
    </div>
  );
}
