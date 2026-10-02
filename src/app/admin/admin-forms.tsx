"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function AdminForms() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createOpportunity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const skills = String(fd.get("skills") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_opportunity",
          title: fd.get("title"),
          company: fd.get("company"),
          type: fd.get("type"),
          location: fd.get("location"),
          work_mode: fd.get("work_mode"),
          stipend: fd.get("stipend"),
          description: fd.get("description"),
          apply_url: fd.get("apply_url"),
          skills,
          is_demo: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Opportunity created");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function createCommunity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_community",
          name: fd.get("name"),
          description: fd.get("description"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Community created");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={createOpportunity} className="glass-card space-y-3 p-5">
        <h2 className="font-medium">Create opportunity</h2>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input name="title" required />
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input name="company" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              name="type"
              className="h-9 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm"
              defaultValue="internship"
            >
              <option value="internship">Internship</option>
              <option value="freelance">Freelance</option>
              <option value="full_time">Full-time</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Work mode</Label>
            <select
              name="work_mode"
              className="h-9 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm"
              defaultValue="remote"
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input name="location" />
        </div>
        <div className="space-y-2">
          <Label>Skills (comma separated)</Label>
          <Input name="skills" placeholder="React, TypeScript" />
        </div>
        <div className="space-y-2">
          <Label>Stipend / Salary</Label>
          <Input name="stipend" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea name="description" rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Apply / LinkedIn job URL</Label>
          <Input
            name="apply_url"
            type="url"
            placeholder="https://www.linkedin.com/jobs/view/…"
            required
          />
          <p className="text-xs text-muted-foreground">
            Paste a LinkedIn (or careers) URL. Students tap Apply → open that
            page. No scraping.
          </p>
        </div>
        <Button type="submit" disabled={loading}>
          Create
        </Button>
      </form>

      <form onSubmit={createCommunity} className="glass-card space-y-3 p-5">
        <h2 className="font-medium">Create community</h2>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input name="name" required placeholder="Kotlin Developers" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea name="description" rows={4} />
        </div>
        <Button type="submit" disabled={loading}>
          Create
        </Button>
      </form>
    </div>
  );
}
