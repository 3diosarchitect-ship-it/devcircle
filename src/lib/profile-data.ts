import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Skill } from "@/types";

export async function getProfileSkillNames(
  supabase: SupabaseClient,
  profileId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("profile_skills")
    .select("skills(name)")
    .eq("profile_id", profileId);

  return (
    data
      ?.map((row) => {
        const skill = row.skills as { name: string } | { name: string }[] | null;
        if (!skill) return null;
        if (Array.isArray(skill)) return skill[0]?.name ?? null;
        return skill.name;
      })
      .filter((n): n is string => !!n) ?? []
  );
}

export async function getProfileSkills(
  supabase: SupabaseClient,
  profileId: string
): Promise<Skill[]> {
  const { data } = await supabase
    .from("profile_skills")
    .select("skills(id, name, slug, category)")
    .eq("profile_id", profileId);

  return (
    data
      ?.map((row) => {
        const skill = row.skills as Skill | Skill[] | null;
        if (!skill) return null;
        if (Array.isArray(skill)) return skill[0] ?? null;
        return skill;
      })
      .filter((s): s is Skill => !!s) ?? []
  );
}

export async function requireUserProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const skills = await getProfileSkillNames(supabase, user.id);

  return { user, profile: profile as Profile, skills };
}
