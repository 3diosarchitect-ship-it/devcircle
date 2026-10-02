import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const opportunityId = body.opportunityId || body.opportunity_id;
  if (!opportunityId) {
    return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
  }

  const { error } = await supabase.from("saved_opportunities").upsert({
    profile_id: user.id,
    opportunity_id: opportunityId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  let opportunityId = url.searchParams.get("opportunity_id");

  if (!opportunityId) {
    try {
      const body = await request.json();
      opportunityId = body.opportunityId || body.opportunity_id;
    } catch {
      // no body
    }
  }

  if (!opportunityId) {
    return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_opportunities")
    .delete()
    .eq("profile_id", user.id)
    .eq("opportunity_id", opportunityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
