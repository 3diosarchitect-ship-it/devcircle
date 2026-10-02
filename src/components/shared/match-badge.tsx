import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

function matchStyles(score: number): string {
  if (score >= 75) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (score >= 50) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  }
  return "border-border bg-muted/60 text-muted-foreground";
}

export function MatchBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        matchStyles(clamped),
        className
      )}
    >
      <Sparkles className="size-3 opacity-80" aria-hidden />
      {clamped}% match
    </span>
  );
}
