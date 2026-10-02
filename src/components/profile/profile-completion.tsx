import Link from "next/link";
import { ArrowRight, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, profileCompletion } from "@/lib/utils";
import type { Profile } from "@/types";

type ProfileCompletionInput = Pick<
  Profile,
  | "full_name"
  | "bio"
  | "college"
  | "course"
  | "city"
  | "avatar_url"
  | "github_url"
  | "linkedin_url"
  | "portfolio_url"
>;

export function ProfileCompletion({
  profile,
  className,
}: {
  profile: ProfileCompletionInput | Profile;
  className?: string;
}) {
  const { percent, missing } = profileCompletion(profile);

  if (percent >= 100) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <UserCircle2 className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Profile {percent}% complete
            </p>
            <Progress value={percent} className="mt-2 h-2 bg-muted" />
          </div>
          {missing.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Missing: {missing.join(", ")}
            </p>
          ) : null}
          <Button asChild size="sm" variant="secondary" className="gap-1">
            <Link href="/settings">
              Complete Profile
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
