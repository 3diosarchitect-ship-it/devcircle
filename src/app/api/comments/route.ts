import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { post_id: string; content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.post_id || !body.content?.trim()) {
    return NextResponse.json(
      { error: "post_id and content are required" },
      { status: 400 }
    );
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: body.post_id,
      author_id: user.id,
      content: body.content.trim(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("community_id")
    .eq("id", body.post_id)
    .single();

  if (post?.community_id) {
    const { data: community } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", post.community_id)
      .single();
    if (community?.slug) {
      revalidatePath(`/communities/${community.slug}`);
    }
  }

  return NextResponse.json({ comment });
}
