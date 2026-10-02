"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  const showAction = actionLabel && (actionHref || onAction);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="font-heading text-base font-medium text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {showAction &&
        (actionHref ? (
          <Button asChild className="mt-6" variant="default">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button className="mt-6" type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        ))}
    </div>
  );
}
