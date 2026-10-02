/** Set NEXT_PUBLIC_ENABLE_OAUTH=true when Google/GitHub are configured in Supabase. */
export const oauthLoginEnabled =
  process.env.NEXT_PUBLIC_ENABLE_OAUTH === "true";
