import { cn } from "@/lib/utils";

export function SkillChip({
  name,
  selected,
  onClick,
  size = "md",
}: {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md border transition",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        selected
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
          : "border-border bg-muted/50 text-muted-foreground hover:border-emerald-500/30 hover:bg-muted hover:text-foreground",
        onClick && "cursor-pointer"
      )}
    >
      {name}
    </Comp>
  );
}
