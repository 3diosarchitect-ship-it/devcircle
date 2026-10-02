import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { postTeamRequestToCommunities } from "@/lib/communities";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, skills } = await request.json();
  if (!title?.trim() || !description?.trim() || !skills?.length) {
    return NextResponse.json(
      { error: "Title, description, and skills required" },
      { status: 400 }
    );
  }

  try {
    // Service role needed to ensure communities exist (RLS blocks non-admin creates)
    let db = supabase;
    try {
      db = createServiceClient();
    } catch {
      // Fall back to user client if communities already seeded
    }

    const teamRequest = await postTeamRequestToCommunities(db, {
      authorId: user.id,
      title: title.trim(),
      description: description.trim(),
      skills,
    });

    // Notify author confirmation
    await supabase.from("notifications").insert({
      profile_id: user.id,
      title: "Teammate request posted",
      body: `"${title}" was shared with matching communities.`,
      link: "/teammates",
    });

    return NextResponse.json({ teamRequest });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
