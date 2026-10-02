"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INITIAL_SKILLS, LOOKING_FOR_OPTIONS, type LookingFor } from "@/types";

export function PeopleFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const skill = searchParams.get("skill") ?? "all";
  const lookingFor = searchParams.get("looking_for") ?? "all";
  const location = searchParams.get("location") ?? "";

  function setParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/people?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="filter-skill">Skill</Label>
        <Select
          value={skill}
          onValueChange={(v) => setParams({ skill: v })}
        >
          <SelectTrigger id="filter-skill">
            <SelectValue placeholder="Any skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any skill</SelectItem>
            {INITIAL_SKILLS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-looking">Looking for</Label>
        <Select
          value={lookingFor}
          onValueChange={(v) => setParams({ looking_for: v })}
        >
          <SelectTrigger id="filter-looking">
            <SelectValue placeholder="Any goal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any goal</SelectItem>
            {LOOKING_FOR_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-location">Location</Label>
        <Input
          id="filter-location"
          placeholder="City"
          defaultValue={location}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setParams({
                location: (e.target as HTMLInputElement).value,
              });
            }
          }}
          onBlur={(e) => setParams({ location: e.target.value })}
        />
      </div>
    </div>
  );
}
