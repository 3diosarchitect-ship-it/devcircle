"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type PostCardData } from "@/components/communities/post-card";
import { toast } from "sonner";

export function PostFeedList({ posts: initialPosts }: { posts: PostCardData[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  function toggleLike(postId: string) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const action = post.liked ? "unlike" : "like";

    setPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              like_count: p.like_count + (p.liked ? -1 : 1),
            }
          : p
      )
    );

    startTransition(async () => {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action }),
      });
      if (!res.ok) {
        toast.error("Could not update like");
        setPosts(initialPosts);
        return;
      }
      const data = await res.json();
      setPosts((current) =>
        current.map((p) =>
          p.id === postId
            ? { ...p, like_count: data.like_count, liked: data.liked }
            : p
        )
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onLike={() => toggleLike(post.id)} />
      ))}
    </div>
  );
}
