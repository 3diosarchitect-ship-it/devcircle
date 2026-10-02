"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OPPORTUNITY_TYPE_LABELS, type OpportunityType, type WorkMode } from "@/types";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import type { Post, Profile } from "@/types";

export function AdminDashboard({
  students,
  posts,
}: {
  students: Pick<Profile, "id" | "full_name" | "username" | "college" | "created_at">[];
  posts: (Post & { author_name: string; community_name: string })[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [opp, setOpp] = useState({
    title: "",
    company: "",
    type: "internship" as OpportunityType,
    work_mode: "remote" as WorkMode,
    location: "",
    skills: "",
    stipend: "",
    description: "",
    apply_url: "",
  });

  const [community, setCommunity] = useState({
    name: "",
    description: "",
    skill_name: "",
  });

  function createOpportunity(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_opportunity",
          payload: {
            ...opp,
            skills: opp.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }
      toast.success("Opportunity created");
      setOpp({
        title: "",
        company: "",
        type: "internship",
        work_mode: "remote",
        location: "",
        skills: "",
        stipend: "",
        description: "",
        apply_url: "",
      });
      router.refresh();
    });
  }

  function createCommunity(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_community",
          payload: community,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }
      toast.success("Community created");
      setCommunity({ name: "", description: "", skill_name: "" });
      router.refresh();
    });
  }

  return (
    <Tabs defaultValue="opportunity" className="space-y-6">
      <TabsList>
        <TabsTrigger value="opportunity">Create opportunity</TabsTrigger>
        <TabsTrigger value="community">Create community</TabsTrigger>
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="posts">Posts</TabsTrigger>
      </TabsList>

      <TabsContent value="opportunity">
        <form onSubmit={createOpportunity} className="max-w-lg space-y-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={opp.title}
              onChange={(e) => setOpp({ ...opp, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={opp.company}
              onChange={(e) => setOpp({ ...opp, company: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={opp.type}
                onValueChange={(v) =>
                  setOpp({ ...opp, type: v as OpportunityType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Work mode</Label>
              <Select
                value={opp.work_mode}
                onValueChange={(v) =>
                  setOpp({ ...opp, work_mode: v as WorkMode })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Skills (comma-separated)</Label>
            <Input
              value={opp.skills}
              onChange={(e) => setOpp({ ...opp, skills: e.target.value })}
              placeholder="React, TypeScript"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={opp.location}
              onChange={(e) => setOpp({ ...opp, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Stipend</Label>
            <Input
              value={opp.stipend}
              onChange={(e) => setOpp({ ...opp, stipend: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={opp.description}
              onChange={(e) => setOpp({ ...opp, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Apply / LinkedIn job URL</Label>
            <Input
              value={opp.apply_url}
              onChange={(e) => setOpp({ ...opp, apply_url: e.target.value })}
              placeholder="https://www.linkedin.com/jobs/view/…"
              required
            />
            <p className="text-xs text-muted-foreground">
              Students tap → open LinkedIn/job page. We store the link + your
              details; we do not scrape LinkedIn.
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            Create opportunity
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="community">
        <form onSubmit={createCommunity} className="max-w-lg space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={community.name}
              onChange={(e) =>
                setCommunity({ ...community, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Linked skill (optional)</Label>
            <Input
              value={community.skill_name}
              onChange={(e) =>
                setCommunity({ ...community, skill_name: e.target.value })
              }
              placeholder="React"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={community.description}
              onChange={(e) =>
                setCommunity({ ...community, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Create community
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="students">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {students.map((s) => (
            <li key={s.id} className="px-4 py-3 text-sm">
              <span className="font-medium">{s.full_name ?? s.username}</span>
              {s.college ? (
                <span className="text-muted-foreground"> · {s.college}</span>
              ) : null}
              <span className="block text-xs text-muted-foreground">
                Joined {formatRelativeTime(s.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="posts">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {posts.map((p) => (
            <li key={p.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{p.author_name}</p>
              <p className="text-xs text-muted-foreground">
                {p.community_name} · {formatRelativeTime(p.created_at)}
              </p>
              <p className="mt-1 line-clamp-2 text-muted-foreground">{p.content}</p>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}
