import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchGithubProfile,
  fetchGithubRepos,
  parseGithubUsername,
} from "@/lib/github";

/** Fetch real public GitHub profile + repos for the logged-in user's github_url. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("github_url")
      .eq("id", user.id)
      .single();

    const username = parseGithubUsername(profile?.github_url);
    if (!username) {
      return NextResponse.json(
        {
          error:
            "Add a valid GitHub profile URL in Settings first (https://github.com/your-username).",
        },
        { status: 400 }
      );
    }

    const [ghProfile, repos] = await Promise.all([
      fetchGithubProfile(username),
      fetchGithubRepos(username, 10),
    ]);

    if (!ghProfile) {
      return NextResponse.json(
        { error: "Could not load that GitHub user. Check the URL." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      source: "github_api",
      username,
      profile: ghProfile,
      repos,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub fetch failed" },
      { status: 500 }
    );
  }
}
