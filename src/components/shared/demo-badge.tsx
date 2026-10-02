import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-teal-500/40 bg-teal-500/10 text-teal-300",
        className
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      {compact ? "Demo" : "Demo Opportunity"}
    </Badge>
  );
}
