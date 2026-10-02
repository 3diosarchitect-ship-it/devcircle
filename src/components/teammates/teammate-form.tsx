"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillChip } from "@/components/shared/skill-chip";
import { INITIAL_SKILLS } from "@/types";
import { toast } from "sonner";

export function TeammateRequestForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(name: string) {
    setSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !skills.length) {
      toast.error("Title, description, and skills are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/teammates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, skills }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Posted to matching communities");
      setTitle("");
      setDescription("");
      setSkills([]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-card space-y-4 p-5">
      <div>
        <h2 className="font-medium">Find Teammates</h2>
        <p className="text-sm text-muted-foreground">
          Your project gets posted to communities matching the skills you need.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Project title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="AI Resume Analyzer"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="I am building an AI resume analyzer and need help with frontend."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Looking for</Label>
        <div className="flex flex-wrap gap-2">
          {INITIAL_SKILLS.map((s) => (
            <SkillChip
              key={s}
              name={s}
              selected={skills.includes(s)}
              onClick={() => toggle(s)}
            />
          ))}
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Posting..." : "Post teammate request"}
      </Button>
    </form>
  );
}
