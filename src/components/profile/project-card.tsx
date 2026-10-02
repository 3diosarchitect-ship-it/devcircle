import { ExternalLink, GitBranch } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkillChip } from "@/components/shared/skill-chip";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

export function ProjectCard({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : null}
        {project.tech_stack.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {project.tech_stack.map((tech) => (
              <SkillChip key={tech} name={tech} size="sm" />
            ))}
          </div>
        ) : null}
      </CardContent>
      {(project.github_url || project.live_url) && (
        <CardFooter className="gap-2">
          {project.github_url ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="size-3.5" aria-hidden />
                GitHub
              </a>
            </Button>
          ) : null}
          {project.live_url ? (
            <Button asChild variant="secondary" size="sm">
              <a
                href={project.live_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Live demo
              </a>
            </Button>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}
