import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Search } from "lucide-react";
import { MatchBadge } from "@/components/shared/match-badge";
import { calculateMatchScore } from "@/lib/matching";
import type { LookingFor, Opportunity } from "@/types";
import {
  isFreshStoredOpportunity,
  jobRetentionCutoffIso,
} from "@/lib/jobs/freshness";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!query) {
    return (
      <div>
        <PageHeader
          title="Search"
          description="Find students, communities, and opportunities."
        />
        <EmptyState
          icon={Search}
          title="Search DevCircle"
          description="Try “React”, a college name, or a community."
        />
      </div>
    );
  }

  const cutoff = jobRetentionCutoffIso();

  const [{ data: communities }, { data: students }, { data: opportunities }, { data: profile }, { data: skillRows }] =
    await Promise.all([
      supabase
        .from("communities")
        .select("name, slug, member_count, description")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10),
      supabase
        .from("profiles")
        .select("username, full_name, college, headline, avatar_url")
        .eq("onboarding_complete", true)
        .or(
          `full_name.ilike.%${query}%,college.ilike.%${query}%,headline.ilike.%${query}%,bio.ilike.%${query}%,username.ilike.%${query}%`
        )
        .limit(10),
      supabase
        .from("opportunities")
        .select("*")
        .gte("created_at", cutoff)
        .or(
          `title.ilike.%${query}%,company.ilike.%${query}%,description.ilike.%${query}%`
        )
        .limit(10),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("profile_skills")
        .select("skill:skills(name)")
        .eq("profile_id", user.id),
    ]);

  // Also find students by skill name
  const { data: skillMatch } = await supabase
    .from("skills")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .limit(5);

  let skillStudents: typeof students = [];
  if (skillMatch?.length) {
    const { data: links } = await supabase
      .from("profile_skills")
      .select("profile:profiles!profile_skills_profile_id_fkey(username, full_name, college, headline, avatar_url)")
      .in(
        "skill_id",
        skillMatch.map((s) => s.id)
      )
      .limit(10);
    skillStudents =
      links
        ?.map((l) => l.profile as unknown as NonNullable<typeof students>[number])
        .filter(Boolean) || [];
  }

  // Opportunities by skill in array
  const skillOppExtra = (
    await supabase
      .from("opportunities")
      .select("*")
      .gte("created_at", cutoff)
      .limit(40)
  ).data
    ?.filter((o) =>
      (o.skills || []).some((s: string) =>
        s.toLowerCase().includes(query.toLowerCase())
      )
    )
    .filter(isFreshStoredOpportunity)
    .slice(0, 10);

  const mergedStudents = [
    ...(students || []),
    ...skillStudents.filter(
      (s) => !(students || []).some((x) => x.username === s.username)
    ),
  ];

  const oppMap = new Map<string, Opportunity>();
  for (const o of [...(opportunities || []), ...(skillOppExtra || [])]) {
    if (!isFreshStoredOpportunity(o)) continue;
    oppMap.set(o.id, o as Opportunity);
  }

  const skillNames =
    skillRows?.map((r) => (r.skill as unknown as { name: string })?.name).filter(Boolean) ||
    [];

  const hasResults =
    (communities?.length || 0) +
      mergedStudents.length +
      oppMap.size >
    0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Results for “${query}”`}
        description="Students, communities, and opportunities."
      />

      {!hasResults ? (
        <EmptyState
          icon={Search}
          title="No results"
          description="Try another keyword like React, iOS, or Internship."
          actionLabel="Browse communities"
          actionHref="/communities"
        />
      ) : (
        <>
          {!!communities?.length && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Communities</h2>
              <div className="space-y-2">
                {communities.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/communities/${c.slug}`}
                    className="glass-card block p-4 transition hover:border-primary/30"
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.member_count} members
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {mergedStudents.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Students</h2>
              <div className="space-y-2">
                {mergedStudents.map((s) => (
                  <Link
                    key={s.username || s.full_name}
                    href={s.username ? `/u/${s.username}` : "#"}
                    className="glass-card block p-4 transition hover:border-primary/30"
                  >
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[s.headline, s.college].filter(Boolean).join(" · ")}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {oppMap.size > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Opportunities</h2>
              <div className="space-y-2">
                {[...oppMap.values()].map((o) => {
                  const match = calculateMatchScore(
                    {
                      skills: skillNames,
                      looking_for: (profile?.looking_for || []) as LookingFor[],
                      city: profile?.city,
                    },
                    o
                  );
                  return (
                    <Link
                      key={o.id}
                      href="/opportunities"
                      className="glass-card flex items-center justify-between gap-3 p-4 transition hover:border-primary/30"
                    >
                      <div>
                        <div className="font-medium">{o.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.company}
                        </div>
                      </div>
                      <MatchBadge score={match.score} />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
