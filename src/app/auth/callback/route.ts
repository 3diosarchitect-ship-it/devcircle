import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichProfileFromOAuth } from "@/lib/auth/oauth-profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let dest = next;
      if (user) {
        const { onboarding_complete } = await enrichProfileFromOAuth(user);
        if (!onboarding_complete) dest = "/onboarding";
      }

      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
