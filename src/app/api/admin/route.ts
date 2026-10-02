import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLinkedInUrl, isValidUrl, slugify } from "@/lib/utils";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase } = auth as { supabase: Awaited<ReturnType<typeof createClient>> };

  const raw = await request.json();
  const body = { ...raw, ...(raw.payload || {}) };
  const { action } = body;

  if (action === "create_opportunity") {
    const applyUrl = (body.apply_url || body.applyUrl || "").trim() || null;
    if (applyUrl && !isValidUrl(applyUrl)) {
      return NextResponse.json({ error: "Invalid apply / LinkedIn URL" }, { status: 400 });
    }

    const linkedIn = isLinkedInUrl(applyUrl);
    const isDemo =
      body.is_demo === false || body.is_demo === "false"
        ? false
        : body.is_demo === true || body.is_demo === "true"
          ? true
          : !applyUrl; // real link → not demo by default

    const { error, data } = await supabase
      .from("opportunities")
      .insert({
        title: body.title,
        company: body.company,
        type: body.type,
        location: body.location || null,
        work_mode: body.work_mode || "remote",
        skills: body.skills || [],
        stipend: body.stipend || null,
        description: body.description || null,
        apply_url: applyUrl || "https://example.com/apply",
        source: body.source || (linkedIn ? "LinkedIn" : "Admin"),
        is_demo: isDemo,
        experience_level: body.experience_level || "internship",
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ opportunity: data });
  }

  if (action === "create_community") {
    const name = body.name as string;
    const slug = slugify(name);
    const { error, data } = await supabase
      .from("communities")
      .insert({
        name,
        slug,
        description: body.description || null,
        is_demo: true,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ community: data });
  }

  // FUTURE: recruiter functionality — company create opportunity, shortlist, contact student

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
