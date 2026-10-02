import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { syncCommunitiesForProfile } from "@/lib/communities";
import {
  isValidGithubUrl,
  isValidUrl,
  slugify,
  usernameFromName,
} from "@/lib/utils";
import type { LookingFor } from "@/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let admin;
    try {
      admin = createServiceClient();
    } catch {
      return NextResponse.json(
        {
          error:
            "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is required for onboarding (skills/communities).",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      full_name,
      avatar_url,
      college,
      course,
      graduation_year,
      city,
      bio,
      skills = [],
      looking_for = [],
      github_url,
      linkedin_url,
      portfolio_url,
    } = body as {
      full_name: string;
      avatar_url?: string;
      college: string;
      course: string;
      graduation_year: number;
      city: string;
      bio: string;
      skills: string[];
      looking_for: LookingFor[];
      github_url?: string;
      linkedin_url?: string;
      portfolio_url?: string;
    };

    if (!full_name?.trim() || !college?.trim() || !skills.length) {
      return NextResponse.json(
        { error: "Name, college, and at least one skill are required" },
        { status: 400 }
      );
    }

    if (github_url && !isValidGithubUrl(github_url)) {
      return NextResponse.json(
        { error: "GitHub URL must look like https://github.com/username" },
        { status: 400 }
      );
    }
    if (linkedin_url && !isValidUrl(linkedin_url)) {
      return NextResponse.json({ error: "Invalid LinkedIn URL" }, { status: 400 });
    }
    if (portfolio_url && !isValidUrl(portfolio_url)) {
      return NextResponse.json({ error: "Invalid portfolio URL" }, { status: 400 });
    }

    const baseUsername = usernameFromName(full_name);
    let username = baseUsername;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (existing) {
      username = `${baseUsername}${Math.floor(Math.random() * 900 + 100)}`;
    }

    const headline =
      skills.length <= 2
        ? `${skills[0]} Developer`
        : skills.includes("MERN")
          ? "MERN Developer"
          : `${skills[0]} Developer`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: full_name.trim(),
        username,
        avatar_url: avatar_url?.trim() || null,
        college: college.trim(),
        course: course?.trim() || null,
        graduation_year: graduation_year || null,
        city: city?.trim() || null,
        bio: bio?.trim() || null,
        headline,
        looking_for,
        github_url: github_url?.trim() || null,
        linkedin_url: linkedin_url?.trim() || null,
        portfolio_url: portfolio_url?.trim() || null,
        onboarding_complete: true,
      })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Skills + communities require service role (RLS: admin-only writes)
    const skillIds: string[] = [];
    for (const name of skills) {
      const slug = slugify(name);
      const { data: existingSkill } = await admin
        .from("skills")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingSkill) {
        skillIds.push(existingSkill.id);
      } else {
        const { data: created, error: skillErr } = await admin
          .from("skills")
          .insert({ name, slug })
          .select("id")
          .single();
        if (skillErr) {
          return NextResponse.json({ error: skillErr.message }, { status: 500 });
        }
        if (created) skillIds.push(created.id);
      }
    }

    await supabase.from("profile_skills").delete().eq("profile_id", user.id);
    if (skillIds.length) {
      const { error: psErr } = await supabase.from("profile_skills").insert(
        skillIds.map((skill_id) => ({
          profile_id: user.id,
          skill_id,
        }))
      );
      if (psErr) {
        return NextResponse.json({ error: psErr.message }, { status: 500 });
      }
    }

    const joined = await syncCommunitiesForProfile(admin, user.id, skillIds);

    return NextResponse.json({ ok: true, username, joined });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onboarding failed" },
      { status: 500 }
    );
  }
}
