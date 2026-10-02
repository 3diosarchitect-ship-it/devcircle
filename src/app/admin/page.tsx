import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminForms } from "./admin-forms";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  const [{ data: students }, { data: posts }, { count: oppCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, username, college, created_at, is_demo")
        .eq("onboarding_complete", true)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("posts")
        .select("id, content, type, created_at, author:profiles!posts_author_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Admin"
          description="Demo admin tools — create opportunities & communities, view students and posts."
        />
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to app
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4">
          <div className="text-2xl font-semibold">{students?.length ?? 0}+</div>
          <div className="text-xs text-muted-foreground">Recent students</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-2xl font-semibold">{posts?.length ?? 0}+</div>
          <div className="text-xs text-muted-foreground">Recent posts</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-2xl font-semibold">{oppCount ?? 0}</div>
          <div className="text-xs text-muted-foreground">Opportunities</div>
        </div>
      </div>

      <AdminForms />

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-medium">Students</h2>
          <div className="space-y-2">
            {(students || []).map((s) => (
              <div key={s.username} className="glass-card px-4 py-3 text-sm">
                <div className="font-medium">
                  {s.full_name}{" "}
                  {s.is_demo && (
                    <span className="text-[10px] text-primary">DEMO</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{s.username} · {s.college}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-medium">Recent posts</h2>
          <div className="space-y-2">
            {(posts || []).map((p) => (
              <div key={p.id} className="glass-card px-4 py-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {(p.author as { full_name?: string } | null)?.full_name} ·{" "}
                  {p.type}
                </div>
                <p className="mt-1 line-clamp-2">{p.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUTURE: recruiter functionality — company accounts, billing, shortlists */}
    </div>
  );
}
