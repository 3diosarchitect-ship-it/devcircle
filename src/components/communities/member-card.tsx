import Link from "next/link";
import { GitBranch } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillChip } from "@/components/shared/skill-chip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LOOKING_FOR_OPTIONS, type LookingFor } from "@/types";
import { cn } from "@/lib/utils";

export type MemberCardMember = {
  id?: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  college: string | null;
  bio: string | null;
  github_url: string | null;
  looking_for?: LookingFor[];
  skills?: string[];
  availability?: string | null;
};

function lookingForLabel(value: LookingFor): string {
  return LOOKING_FOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function MemberCard({
  member,
  className,
}: {
  member: MemberCardMember;
  className?: string;
}) {
  const displayName = member.full_name ?? member.username ?? "Developer";
  const username = member.username;
  const href = username ? `/u/${username}` : "#";
  const bioSnippet = member.bio
    ? member.bio.length > 120
      ? `${member.bio.slice(0, 120).trim()}…`
      : member.bio
    : null;
  const lookingFor = member.looking_for ?? [];

  return (
    <Card
      className={cn("transition-colors hover:ring-emerald-500/15", className)}
    >
      <CardHeader className="flex flex-row items-start gap-3">
        <Link href={href} className="shrink-0">
          <UserAvatar name={displayName} src={member.avatar_url} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="font-heading text-base font-medium text-foreground hover:text-emerald-300"
          >
            {displayName}
          </Link>
          {member.college ? (
            <p className="text-sm text-muted-foreground">{member.college}</p>
          ) : null}
        </div>
        {member.github_url ? (
          <a
            href={member.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-emerald-300"
            aria-label="GitHub profile"
          >
            <GitBranch className="size-4" />
          </a>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {member.skills && member.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {member.skills.slice(0, 6).map((skill) => (
              <SkillChip key={skill} name={skill} size="sm" />
            ))}
          </div>
        ) : null}
        {(lookingFor.length > 0 || member.availability) && (
          <div className="flex flex-wrap gap-1.5">
            {lookingFor.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="border-emerald-500/25 text-emerald-200/90"
              >
                {lookingForLabel(item)}
              </Badge>
            ))}
            {member.availability ? (
              <Badge variant="secondary">{member.availability}</Badge>
            ) : null}
          </div>
        )}
        {bioSnippet ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {bioSnippet}
          </p>
        ) : null}
        {username ? (
          <Link
            href={href}
            className="inline-block text-xs font-medium text-emerald-400 hover:underline"
          >
            View profile
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
