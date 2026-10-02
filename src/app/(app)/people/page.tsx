import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { MemberCard } from "@/components/communities/member-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { LOOKING_FOR_OPTIONS, type LookingFor, type Profile } from "@/types";
import { Users } from "lucide-react";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    skill?: string;
    looking?: string;
    location?: string;
    community?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();
  if (!me?.onboarding_complete) redirect("/onboarding");

  const { data: allSkills } = await supabase
    .from("skills")
    .select("name, slug")
    .order("name");

  let profilesQuery = supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_complete", true)
    .neq("id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (params.looking) {
    profilesQuery = profilesQuery.contains("looking_for", [params.looking]);
  }
  if (params.location) {
    profilesQuery = profilesQuery.ilike("city", `%${params.location}%`);
  }

  const { data: profiles } = await profilesQuery;

  let filtered = (profiles || []) as Profile[];

  // Skill filter via profile_skills
  if (params.skill) {
    const { data: skill } = await supabase
      .from("skills")
      .select("id")
      .ilike("name", params.skill)
      .maybeSingle();
    if (skill) {
      const { data: links } = await supabase
        .from("profile_skills")
        .select("profile_id")
        .eq("skill_id", skill.id);
      const ids = new Set((links || []).map((l) => l.profile_id));
      filtered = filtered.filter((p) => ids.has(p.id));
    } else {
      filtered = [];
    }
  }

  if (params.community) {
    const { data: community } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.community)
      .maybeSingle();
    if (community) {
      const { data: members } = await supabase
        .from("community_members")
        .select("profile_id")
        .eq("community_id", community.id);
      const ids = new Set((members || []).map((m) => m.profile_id));
      filtered = filtered.filter((p) => ids.has(p.id));
    }
  }

  const ids = filtered.map((p) => p.id);
  const { data: skillLinks } = ids.length
    ? await supabase
        .from("profile_skills")
        .select("profile_id, skill:skills(name)")
        .in("profile_id", ids)
    : { data: [] as { profile_id: string }[] };

  const skillsMap = new Map<string, string[]>();
  for (const row of skillLinks || []) {
    const name = (row as { skill?: { name?: string } }).skill?.name;
    if (!name) continue;
    const arr = skillsMap.get(row.profile_id) || [];
    arr.push(name);
    skillsMap.set(row.profile_id, arr);
  }

  function href(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { ...params, ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const q = sp.toString();
    return q ? `/people?${q}` : "/people";
  }

  return (
    <div>
      <PageHeader
        title="Find Developers"
        description="A talent network of students building in public — filter by skill, goals, and location."
      />

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={!params.skill ? "default" : "outline"} asChild>
            <Link href={href({ skill: undefined })}>All skills</Link>
          </Button>
          {(allSkills || []).slice(0, 12).map((s) => (
            <Button
              key={s.slug}
              size="sm"
              variant={params.skill === s.name ? "default" : "outline"}
              asChild
            >
              <Link href={href({ skill: s.name })}>{s.name}</Link>
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {LOOKING_FOR_OPTIONS.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant={params.looking === o.value ? "default" : "outline"}
              asChild
            >
              <Link
                href={href({
                  looking: params.looking === o.value ? undefined : o.value,
                })}
              >
                {o.label}
              </Link>
            </Button>
          ))}
        </div>
        <form className="flex max-w-sm gap-2">
          <input type="hidden" name="skill" value={params.skill || ""} />
          <input type="hidden" name="looking" value={params.looking || ""} />
          <input
            name="location"
            defaultValue={params.location || ""}
            placeholder="City / location"
            className="h-9 flex-1 rounded-lg border border-input bg-secondary/50 px-3 text-sm"
          />
          <Button type="submit" size="sm">
            Filter
          </Button>
        </form>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No developers found"
          description="Try a different skill or clear filters."
          actionLabel="Clear filters"
          actionHref="/people"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <MemberCard
              key={p.id}
              member={{
                username: p.username,
                full_name: p.full_name,
                avatar_url: p.avatar_url,
                college: p.college,
                bio: p.bio,
                github_url: p.github_url,
                looking_for: p.looking_for,
                skills: skillsMap.get(p.id) || [],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
