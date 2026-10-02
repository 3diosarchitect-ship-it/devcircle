import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Allow onboarding without full shell chrome feel — still use shell for consistency
  // except we redirect incomplete profiles away from most pages in those pages.

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("read", false);

  return (
    <AppShell profile={profile as Profile} unreadCount={count || 0}>
      {children}
    </AppShell>
  );
}
