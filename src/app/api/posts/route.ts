import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUrl } from "@/lib/utils";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const communityId = body.communityId || body.community_id;
  const content = body.content;
  const type = body.type || "question";
  const linkUrl = (body.link_url || body.linkUrl || "").trim() || null;

  if (!communityId || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (linkUrl && !isValidUrl(linkUrl)) {
    return NextResponse.json({ error: "Invalid job URL" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      community_id: communityId,
      content: content.trim(),
      type,
      link_url: linkUrl,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const postId = body.postId || body.post_id;
  const action = body.action;

  if (!postId || !["like", "unlike"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "like") {
    const { error } = await supabase.from("post_likes").upsert({
      post_id: postId,
      profile_id: user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("like_count")
    .eq("id", postId)
    .single();

  return NextResponse.json({
    ok: true,
    liked: action === "like",
    like_count: post?.like_count ?? 0,
  });
}
