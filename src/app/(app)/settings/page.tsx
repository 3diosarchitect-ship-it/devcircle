import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "./settings-form";
import type { Profile } from "@/types";

export default async function SettingsPage() {
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
  if (!profile) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Update your developer profile. Only you can edit these fields."
      />
      <SettingsForm profile={profile as Profile} />
    </div>
  );
}
