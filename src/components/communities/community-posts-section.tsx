"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostCard, type PostCardData } from "@/components/communities/post-card";
import { CreatePostForm } from "@/components/communities/create-post-form";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function CommunityPostsSection({
  communityId,
  posts: initialPosts,
  joined,
}: {
  communityId: string;
  posts: PostCardData[];
  joined: boolean;
}) {
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
    const optimistic = posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            liked: !p.liked,
            like_count: p.like_count + (p.liked ? -1 : 1),
          }
        : p
    );
    setPosts(optimistic);

    startTransition(async () => {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action }),
      });
      if (!res.ok) {
        setPosts(initialPosts);
        toast.error("Could not update like");
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
    <div className="space-y-6">
      {joined ? (
        <CreatePostForm communityId={communityId} />
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No posts yet"
          description={
            joined
              ? "Start the conversation with a question or project update."
              : "Join this community to post and engage with members."
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => toggleLike(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
