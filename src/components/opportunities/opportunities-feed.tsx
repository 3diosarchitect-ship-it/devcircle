"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import type { Opportunity, OpportunityType, WorkMode } from "@/types";
import { OPPORTUNITY_TYPE_LABELS } from "@/types";

export type ScoredOpportunity = {
  opportunity: Opportunity;
  matchScore: number;
  matchReasons: string[];
};

export function OpportunitiesFeed({
  items,
  savedIds,
}: {
  items: ScoredOpportunity[];
  savedIds: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds));
  const [pending, startTransition] = useTransition();

  const typeFilter = searchParams.get("type") ?? "all";
  const modeFilter = searchParams.get("work_mode") ?? "all";
  const skillQuery = searchParams.get("q") ?? "";

  const filtered = useMemo(() => {
    return items.filter(({ opportunity }) => {
      if (typeFilter !== "all" && opportunity.type !== typeFilter) return false;
      if (modeFilter !== "all" && opportunity.work_mode !== modeFilter)
        return false;
      if (skillQuery.trim()) {
        const q = skillQuery.trim().toLowerCase();
        const inSkills = opportunity.skills.some((s) =>
          s.toLowerCase().includes(q)
        );
        const inTitle = opportunity.title.toLowerCase().includes(q);
        if (!inSkills && !inTitle) return false;
      }
      return true;
    });
  }, [items, typeFilter, modeFilter, skillQuery]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/opportunities?${params.toString()}`);
  }

  async function toggleSave(opportunityId: string) {
    const isSaved = saved.has(opportunityId);
    startTransition(async () => {
      try {
        if (isSaved) {
          const res = await fetch(
            `/api/opportunities/save?opportunity_id=${encodeURIComponent(opportunityId)}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error("Failed to unsave");
          setSaved((prev) => {
            const next = new Set(prev);
            next.delete(opportunityId);
            return next;
          });
          toast.success("Removed from saved");
        } else {
          const res = await fetch("/api/opportunities/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opportunity_id: opportunityId }),
          });
          if (!res.ok) throw new Error("Failed to save");
          setSaved((prev) => new Set(prev).add(opportunityId));
          toast.success("Opportunity saved");
        }
      } catch {
        toast.error("Could not update saved list");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="opp-type">Type</Label>
          <Select value={typeFilter} onValueChange={(v) => setParam("type", v)}>
            <SelectTrigger id="opp-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.keys(OPPORTUNITY_TYPE_LABELS) as OpportunityType[]).map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {OPPORTUNITY_TYPE_LABELS[t]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opp-mode">Work mode</Label>
          <Select
            value={modeFilter}
            onValueChange={(v) => setParam("work_mode", v)}
          >
            <SelectTrigger id="opp-mode">
              <SelectValue placeholder="All modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opp-skill">Skill search</Label>
          <Input
            id="opp-skill"
            placeholder="e.g. React"
            defaultValue={skillQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParam("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => setParam("q", e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No opportunities match"
          description="Try clearing filters or browse all listings."
          actionLabel="Clear filters"
          onAction={() => router.push("/opportunities")}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(({ opportunity, matchScore, matchReasons }) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              matchScore={matchScore}
              matchReasons={matchReasons}
              saved={saved.has(opportunity.id)}
              onSave={() => toggleSave(opportunity.id)}
            />
          ))}
        </div>
      )}
      {pending ? (
        <p className="text-center text-xs text-muted-foreground">Updating…</p>
      ) : null}
    </div>
  );
}
