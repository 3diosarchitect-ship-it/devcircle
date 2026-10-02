"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { toast } from "sonner";

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    college: profile.college ?? "",
    course: profile.course ?? "",
    city: profile.city ?? "",
    graduation_year: profile.graduation_year?.toString() ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    portfolio_url: profile.portfolio_url ?? "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          college: form.college.trim() || null,
          course: form.course.trim() || null,
          city: form.city.trim() || null,
          graduation_year: form.graduation_year
            ? parseInt(form.graduation_year, 10)
            : null,
          github_url: form.github_url.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          portfolio_url: form.portfolio_url.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={form.headline}
            onChange={(e) => update("headline", e.target.value)}
            placeholder="iOS dev · SwiftUI enthusiast"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="college">College</Label>
          <Input
            id="college"
            value={form.college}
            onChange={(e) => update("college", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="course">Course</Label>
          <Input
            id="course"
            value={form.course}
            onChange={(e) => update("course", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="graduation_year">Graduation year</Label>
          <Input
            id="graduation_year"
            type="number"
            value={form.graduation_year}
            onChange={(e) => update("graduation_year", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="github_url">GitHub URL</Label>
          <Input
            id="github_url"
            value={form.github_url}
            onChange={(e) => update("github_url", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            value={form.linkedin_url}
            onChange={(e) => update("linkedin_url", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="portfolio_url">Portfolio URL</Label>
          <Input
            id="portfolio_url"
            value={form.portfolio_url}
            onChange={(e) => update("portfolio_url", e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
