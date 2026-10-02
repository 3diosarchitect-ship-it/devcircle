"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { isValidGithubUrl, isValidUrl } from "@/lib/utils";
import type { Profile } from "@/types";
import { toast } from "sonner";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    username: profile.username || "",
    avatar_url: profile.avatar_url || "",
    college: profile.college || "",
    course: profile.course || "",
    graduation_year: profile.graduation_year?.toString() || "",
    city: profile.city || "",
    bio: profile.bio || "",
    headline: profile.headline || "",
    github_url: profile.github_url || "",
    linkedin_url: profile.linkedin_url || "",
    portfolio_url: profile.portfolio_url || "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.github_url && !isValidGithubUrl(form.github_url)) {
      toast.error("Invalid GitHub URL");
      return;
    }
    if (form.linkedin_url && !isValidUrl(form.linkedin_url)) {
      toast.error("Invalid LinkedIn URL");
      return;
    }
    if (form.portfolio_url && !isValidUrl(form.portfolio_url)) {
      toast.error("Invalid portfolio URL");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        username: form.username,
        avatar_url: form.avatar_url || null,
        college: form.college || null,
        course: form.course || null,
        graduation_year: form.graduation_year
          ? Number(form.graduation_year)
          : null,
        city: form.city || null,
        bio: form.bio || null,
        headline: form.headline || null,
        github_url: form.github_url || null,
        linkedin_url: form.linkedin_url || null,
        portfolio_url: form.portfolio_url || null,
      })
      .eq("id", profile.id);

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-4">
      {(
        [
          ["full_name", "Full name"],
          ["username", "Username"],
          ["headline", "Headline"],
          ["avatar_url", "Avatar URL"],
          ["college", "College"],
          ["course", "Course"],
          ["graduation_year", "Graduation year"],
          ["city", "City"],
          ["github_url", "GitHub URL"],
          ["linkedin_url", "LinkedIn URL"],
          ["portfolio_url", "Portfolio URL"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={4}
        />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={logout}>
          Log out
        </Button>
      </div>
    </form>
  );
}
