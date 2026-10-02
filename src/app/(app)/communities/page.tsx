import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UsersRound } from "lucide-react";

export default async function CommunitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const { data: communities } = await supabase
    .from("communities")
    .select("*")
    .order("member_count", { ascending: false });

  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("profile_id", user.id);

  const joined = new Set((memberships || []).map((m) => m.community_id));

  return (
    <div>
      <PageHeader
        title="Communities"
        description="Skill-based circles you're matched into automatically — and more to explore."
      />
      {!communities?.length ? (
        <EmptyState
          icon={UsersRound}
          title="No communities yet"
          description="Seed the database or complete onboarding to create communities from skills."
          actionLabel="Go to Dashboard"
          actionHref="/dashboard"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/communities/${c.slug}`}
              className="glass-card block p-5 transition hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{c.name}</h2>
                {joined.has(c.id) && (
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                    Joined
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {c.description}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {c.member_count} members
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
