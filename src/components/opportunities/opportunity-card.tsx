"use client";

import { Bookmark, Briefcase, Clock, ExternalLink, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/shared/demo-badge";
import { MatchBadge } from "@/components/shared/match-badge";
import { SkillChip } from "@/components/shared/skill-chip";
import { applyLinkLabel, cn, formatRelativeTime } from "@/lib/utils";
import { detectJobBoard, jobBoardLabel } from "@/lib/jobs/big-boards";
import { OPPORTUNITY_TYPE_LABELS, type Opportunity } from "@/types";
import { toast } from "sonner";

const WORK_MODE_LABELS: Record<Opportunity["work_mode"], string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
};

export function OpportunityCard({
  opportunity,
  matchScore,
  matchReasons,
  saved = false,
  onSave,
  onApply,
  className,
}: {
  opportunity: Opportunity;
  matchScore?: number;
  matchReasons?: string[];
  saved?: boolean;
  onSave?: () => void;
  onApply?: () => void;
  className?: string;
}) {
  const skills = opportunity.skills || [];
  const locationLine = [
    opportunity.location,
    WORK_MODE_LABELS[opportunity.work_mode],
  ]
    .filter(Boolean)
    .join(" · ");
  const cta = applyLinkLabel(opportunity.apply_url);
  const board = detectJobBoard(opportunity.apply_url);
  const boardName = jobBoardLabel(board);

  function handleApply() {
    if (onApply) {
      onApply();
      return;
    }
    if (opportunity.is_demo) {
      toast.message("Demo opportunity — not a real vacancy.", {
        description: opportunity.apply_url
          ? "Opening the sample apply link."
          : undefined,
      });
    }
    if (opportunity.apply_url) {
      window.open(opportunity.apply_url, "_blank", "noopener,noreferrer");
    } else if (!opportunity.is_demo) {
      toast.error("No apply link provided for this listing.");
    }
  }

  return (
    <Card
      className={cn("transition-colors hover:ring-primary/20", className)}
    >
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base leading-snug">
              {opportunity.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{opportunity.company}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {matchScore != null ? <MatchBadge score={matchScore} /> : null}
            {opportunity.is_demo ? <DemoBadge /> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Briefcase className="size-3" aria-hidden />
            {OPPORTUNITY_TYPE_LABELS[opportunity.type]}
          </Badge>
          {locationLine ? (
            <Badge variant="outline" className="gap-1 font-normal">
              <MapPin className="size-3" aria-hidden />
              {locationLine}
            </Badge>
          ) : null}
          {boardName ? (
            <Badge variant="outline" className="font-normal">
              {boardName}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunity.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {opportunity.description}
          </p>
        ) : null}
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <SkillChip key={skill} name={skill} size="sm" />
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {opportunity.stipend ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Wallet className="size-3.5" aria-hidden />
              {opportunity.stipend}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {formatRelativeTime(opportunity.created_at)}
          </span>
          {opportunity.source ? (
            <span>Source: {opportunity.source}</span>
          ) : null}
        </div>
        {matchReasons && matchReasons.length > 0 ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Why this matches</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {matchReasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="gap-2">
        <Button type="button" onClick={handleApply} className="flex-1 sm:flex-none">
          {cta}
          <ExternalLink className="size-3.5" />
        </Button>
        {onSave ? (
          <Button
            type="button"
            variant={saved ? "secondary" : "outline"}
            size="icon"
            aria-label={saved ? "Remove from saved" : "Save opportunity"}
            onClick={onSave}
          >
            <Bookmark
              className={cn("size-4", saved && "fill-current text-primary")}
            />
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
