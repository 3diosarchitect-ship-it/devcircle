"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function AddProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tech, setTech] = useState("");
  const [github, setGithub] = useState("");
  const [live, setLive] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not logged in");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("projects").insert({
      profile_id: user.id,
      name,
      description,
      tech_stack: tech
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      github_url: github || null,
      live_url: live || null,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Project added");
    setOpen(false);
    setName("");
    setDescription("");
    setTech("");
    setGithub("");
    setLive("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Create Project
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card space-y-3 p-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Tech stack (comma separated)</Label>
        <Input
          value={tech}
          onChange={(e) => setTech(e.target.value)}
          placeholder="React, Node.js"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>GitHub</Label>
          <Input value={github} onChange={(e) => setGithub(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Live demo</Label>
          <Input value={live} onChange={(e) => setLive(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save project"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
