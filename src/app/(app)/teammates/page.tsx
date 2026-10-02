import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { TeammateRequestForm } from "@/components/teammates/teammate-form";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SkillChip } from "@/components/shared/skill-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { Users } from "lucide-react";

export default async function TeammatesPage() {
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

  const { data: requests } = await supabase
    .from("team_requests")
    .select("*, author:profiles!team_requests_author_id_fkey(username, full_name, avatar_url, college)")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Find Teammates"
        description="Collaborate on projects even when you're not job hunting — the reason to keep coming back."
      />

      <TeammateRequestForm />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Open requests</h2>
        {!requests?.length ? (
          <EmptyState
            icon={Users}
            title="No teammate requests yet"
            description="Be the first to post a project and find collaborators."
          />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const author = r.author as {
                username: string | null;
                full_name: string | null;
                avatar_url: string | null;
                college: string | null;
              };
              return (
                <article key={r.id} className="glass-card p-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={author?.full_name}
                      src={author?.avatar_url}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{r.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {r.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(r.looking_for_skills || []).map((s: string) => (
                          <SkillChip key={s} name={s} size="sm" />
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {author?.username ? (
                          <Link
                            href={`/u/${author.username}`}
                            className="text-primary hover:underline"
                          >
                            {author.full_name}
                          </Link>
                        ) : (
                          <span>{author?.full_name}</span>
                        )}
                        {author?.college && <span>· {author.college}</span>}
                        <span>· {formatRelativeTime(r.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
