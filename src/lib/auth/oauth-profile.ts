import { createClient } from "@/lib/supabase/server";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>;
};

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function slugUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24) || "dev";
}

/**
 * After Google / GitHub OAuth, fill profile fields from provider metadata.
 */
export async function enrichProfileFromOAuth(user: AuthUser) {
  const supabase = await createClient();
  const meta = user.user_metadata || {};
  const identities = user.identities || [];
  const githubIdentity = identities.find((i) => i.provider === "github");
  const googleIdentity = identities.find((i) => i.provider === "google");

  const githubLogin = pickString(
    meta.user_name,
    meta.preferred_username,
    githubIdentity?.identity_data?.user_name,
    githubIdentity?.identity_data?.preferred_username
  );

  const fullName = pickString(
    meta.full_name,
    meta.name,
    googleIdentity?.identity_data?.full_name,
    googleIdentity?.identity_data?.name,
    githubIdentity?.identity_data?.full_name,
    githubIdentity?.identity_data?.name
  );

  const avatarUrl = pickString(
    meta.avatar_url,
    meta.picture,
    googleIdentity?.identity_data?.avatar_url,
    googleIdentity?.identity_data?.picture,
    githubIdentity?.identity_data?.avatar_url
  );

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, github_url, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) return { onboarding_complete: false };

  const updates: Record<string, string | null> = {};

  if (fullName && (!existing.full_name || existing.full_name === user.email?.split("@")[0])) {
    updates.full_name = fullName;
  }
  if (avatarUrl && !existing.avatar_url) {
    updates.avatar_url = avatarUrl;
  }
  if (githubLogin) {
    const ghUrl = `https://github.com/${githubLogin}`;
    if (!existing.github_url) updates.github_url = ghUrl;
    // Prefer clean GitHub username when current looks auto-generated
    if (
      !existing.username ||
      /_[a-f0-9]{6}$/i.test(existing.username) ||
      existing.username.startsWith("user")
    ) {
      const base = slugUsername(githubLogin);
      const candidate = base;
      const { data: clash } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", candidate)
        .neq("id", user.id)
        .maybeSingle();
      updates.username = clash
        ? `${base}_${user.id.replace(/-/g, "").slice(0, 6)}`
        : candidate;
    }
  }

  if (Object.keys(updates).length) {
    await supabase.from("profiles").update(updates).eq("id", user.id);
  }

  return { onboarding_complete: !!existing.onboarding_complete };
}
