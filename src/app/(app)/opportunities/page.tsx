import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calculateMatchScore } from "@/lib/matching";
import { PageHeader } from "@/components/shared/page-header";
import { OpportunityListWithSave } from "@/components/opportunities/opportunity-list-with-save";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import type { LookingFor, Opportunity, OpportunityType, WorkMode } from "@/types";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    mode?: string;
    skill?: string;
    saved?: string;
    region?: string;
    community?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const { data: skillRows } = await supabase
    .from("profile_skills")
    .select("skill:skills(name)")
    .eq("profile_id", user.id);
  const skillNames =
    skillRows?.map((r) => (r.skill as unknown as { name: string })?.name).filter(Boolean) ||
    [];

  // Community-wise: resolve community slug → skill name
  let communitySkill = params.skill || "";
  let communityLabel = "";
  if (params.community) {
    const { data: community } = await supabase
      .from("communities")
      .select("name, skill:skills(name)")
      .eq("slug", params.community)
      .maybeSingle();
    const sn = (community?.skill as unknown as { name?: string } | null)?.name;
    if (sn) {
      communitySkill = sn;
      communityLabel = community?.name || sn;
    }
  }

  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (params.type) query = query.eq("type", params.type);
  if (params.mode) query = query.eq("work_mode", params.mode);

  let { data: opportunities } = await query;

  if (!opportunities?.length) {
    let demoQuery = supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });
    if (params.type) demoQuery = demoQuery.eq("type", params.type);
    if (params.mode) demoQuery = demoQuery.eq("work_mode", params.mode);
    const demo = await demoQuery;
    opportunities = demo.data;
  }

  const { data: saved } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("profile_id", user.id);
  const savedIds = new Set((saved || []).map((s) => s.opportunity_id));

  let list = (opportunities || []) as Opportunity[];
  if (communitySkill) {
    const s = communitySkill.toLowerCase();
    list = list.filter((o) =>
      (o.skills || []).some((sk) => sk.toLowerCase().includes(s))
    );
  }
  if (params.region === "india") {
    list = list.filter(
      (o) =>
        /india|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|pune|noida|gurgaon|indore/i.test(
          `${o.location || ""} ${o.source || ""} ${o.title}`
        ) || (o.source || "").toLowerCase().includes("india")
    );
  }
  if (params.region === "oss") {
    list = list.filter(
      (o) =>
        o.type === "project" ||
        (o.source || "").toLowerCase().includes("open source") ||
        (o.title || "").startsWith("[OSS]")
    );
  }
  if (params.saved === "1") {
    list = list.filter((o) => savedIds.has(o.id));
  }

  const ranked = list
    .map((opp) => {
      const match = calculateMatchScore(
        {
          skills: skillNames,
          looking_for: (profile.looking_for || []) as LookingFor[],
          city: profile.city,
        },
        opp
      );
      return { opp, ...match };
    })
    .sort((a, b) => b.score - a.score);

  const types: { value: OpportunityType | ""; label: string }[] = [
    { value: "", label: "All types" },
    { value: "internship", label: "Internship" },
    { value: "freelance", label: "Freelance" },
    { value: "full_time", label: "Full-time" },
    { value: "project", label: "Project" },
  ];
  const modes: { value: WorkMode | ""; label: string }[] = [
    { value: "", label: "All modes" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "On-site" },
  ];

  function href(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { ...params, ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const q = sp.toString();
    return q ? `/opportunities?${q}` : "/opportunities";
  }

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description={
          communityLabel
            ? `Filtered for ${communityLabel} — jobs & OSS matching this community’s skill.`
            : "Internships, freelance, India roles, and open-source projects matched to your skills."
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {types.map((t) => (
          <Button
            key={t.label}
            size="sm"
            variant={(params.type || "") === t.value ? "default" : "outline"}
            asChild
          >
            <Link href={href({ type: t.value || undefined })}>{t.label}</Link>
          </Button>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-border sm:inline-block" />
        {modes.map((m) => (
          <Button
            key={m.label}
            size="sm"
            variant={(params.mode || "") === m.value ? "default" : "outline"}
            asChild
          >
            <Link href={href({ mode: m.value || undefined })}>{m.label}</Link>
          </Button>
        ))}
        <Button
          size="sm"
          variant={params.region === "india" ? "default" : "outline"}
          asChild
        >
          <Link
            href={href({
              region: params.region === "india" ? undefined : "india",
            })}
          >
            🇮🇳 India
          </Link>
        </Button>
        <Button
          size="sm"
          variant={params.region === "oss" ? "default" : "outline"}
          asChild
        >
          <Link
            href={href({
              region: params.region === "oss" ? undefined : "oss",
            })}
          >
            Open Source
          </Link>
        </Button>
        <Button
          size="sm"
          variant={params.saved === "1" ? "default" : "outline"}
          asChild
        >
          <Link href={href({ saved: params.saved === "1" ? undefined : "1" })}>
            Saved
          </Link>
        </Button>
      </div>

      <form className="mb-6">
        <input type="hidden" name="type" value={params.type || ""} />
        <input type="hidden" name="mode" value={params.mode || ""} />
        <div className="flex gap-2">
          <input
            name="skill"
            defaultValue={params.skill || ""}
            placeholder="Filter by skill (e.g. React)"
            className="h-9 flex-1 rounded-lg border border-input bg-secondary/50 px-3 text-sm"
          />
          <Button type="submit" size="sm">
            Filter
          </Button>
        </div>
      </form>

      {ranked.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={params.saved === "1" ? "No saved opportunities yet." : "No opportunities found"}
          description="Try clearing filters or explore all listings."
          actionLabel="Explore Opportunities"
          actionHref="/opportunities"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <OpportunityListWithSave
            items={ranked.map(({ opp, score, reasons }) => ({
              opportunity: opp,
              matchScore: score,
              matchReasons: reasons,
            }))}
            savedIds={[...savedIds]}
          />
        </div>
      )}
    </div>
  );
}
