"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { INITIAL_SKILLS } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function TeammateRequestForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function toggleSkill(name: string) {
    setSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if (skills.length === 0) {
      toast.error("Pick at least one skill");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/teammates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, skills }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create request");
        return;
      }
      setTitle("");
      setDescription("");
      setSkills([]);
      toast.success("Team request posted to matching communities");
      onCreated?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-emerald-500/20 bg-card/50 p-5"
    >
      <div>
        <h2 className="font-heading text-lg font-medium">Post a team request</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll share it in communities that match your required skills.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tr-title">Title</Label>
        <Input
          id="tr-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Hackathon team for fintech app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tr-desc">Description</Label>
        <Textarea
          id="tr-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What you're building, timeline, and what roles you need…"
        />
      </div>
      <div className="space-y-2">
        <Label>Skills needed</Label>
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-3">
          {INITIAL_SKILLS.map((skill) => (
            <label
              key={skill}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={skills.includes(skill)}
                onCheckedChange={() => toggleSkill(skill)}
              />
              <span>{skill}</span>
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Posting…" : "Post request"}
      </Button>
    </form>
  );
}
