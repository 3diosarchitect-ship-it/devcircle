"use client";

import Link from "next/link";
import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  applyLinkLabel,
  cn,
  formatPostedOn,
  formatRelativeTime,
  isLinkedInUrl,
} from "@/lib/utils";
import { POST_TYPE_LABELS, type Post, type PostType } from "@/types";

export type PostCardData = Post & {
  author: {
    name: string;
    username: string | null;
    avatar_url?: string | null;
  };
  community: {
    name: string;
    slug: string;
  };
  liked?: boolean;
};

export function PostCard({
  post,
  onLike,
  onComment,
  className,
}: {
  post: PostCardData;
  onLike?: () => void;
  onComment?: () => void;
  className?: string;
}) {
  const authorHref = post.author.username
    ? `/u/${post.author.username}`
    : undefined;
  const linkUrl = post.link_url?.trim() || null;
  const authorName = post.author.name || "Member";

  return (
    <Card className={cn(className)}>
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          {authorHref ? (
            <Link href={authorHref}>
              <UserAvatar
                name={authorName}
                src={post.author.avatar_url}
                size="sm"
              />
            </Link>
          ) : (
            <UserAvatar
              name={authorName}
              src={post.author.avatar_url}
              size="sm"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Posted by</span>
              {authorHref ? (
                <Link
                  href={authorHref}
                  className="font-medium text-foreground hover:text-emerald-300"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="font-medium">{authorName}</span>
              )}
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/communities/${post.community.slug}`}
                className="text-muted-foreground hover:text-emerald-300"
              >
                {post.community.name}
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Posted on {formatPostedOn(post.created_at)}
              <span className="mx-1.5">·</span>
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
          <PostTypeBadge type={post.type} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {post.content}
        </p>
        {linkUrl ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              {applyLinkLabel(linkUrl)}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : null}
      </CardContent>
      <CardFooter className="gap-1 border-t-0 bg-transparent pt-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-muted-foreground",
            post.liked && "text-emerald-400"
          )}
          onClick={onLike}
        >
          <Heart
            className={cn("size-4", post.liked && "fill-current")}
            aria-hidden
          />
          {post.like_count}
        </Button>
        {onComment ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={onComment}
          >
            <MessageCircle className="size-4" aria-hidden />
            {post.comment_count}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
            <MessageCircle className="size-4" aria-hidden />
            {post.comment_count}
          </span>
        )}
        {isLinkedInUrl(linkUrl) ? (
          <span className="ml-auto text-xs text-muted-foreground">LinkedIn</span>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function PostTypeBadge({ type }: { type: PostType }) {
  return (
    <Badge variant="outline" className="shrink-0 border-border text-xs">
      {POST_TYPE_LABELS[type]}
    </Badge>
  );
}
