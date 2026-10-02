"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidUrl } from "@/lib/utils";
import { POST_TYPE_LABELS, type PostType } from "@/types";
import { toast } from "sonner";

export function CreatePostForm({
  communityId,
  onCreated,
}: {
  communityId: string;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [type, setType] = useState<PostType>("question");
  const [loading, setLoading] = useState(false);

  const showLinkField = type === "opportunity";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (linkUrl.trim() && !isValidUrl(linkUrl)) {
      toast.error("Invalid job URL");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          content,
          type,
          link_url: linkUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setContent("");
      setLinkUrl("");
      toast.success("Post published");
      onCreated?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={(v) => setType(v as PostType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Post type" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {POST_TYPE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          showLinkField
            ? "Describe the role (title, skills, location, stipend)…"
            : "Share a question, project, or teammate ask…"
        }
        rows={3}
      />
      {showLinkField ? (
        <div className="space-y-2">
          <Label htmlFor="job-link">Job link (LinkedIn / Naukri / Indeed)</Label>
          <Input
            id="job-link"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://www.naukri.com/… or linkedin.com/jobs/view/…"
          />
          <p className="text-xs text-muted-foreground">
            Paste a real job URL from LinkedIn, Naukri, or Indeed. Members tap
            → open that site. We never scrape those boards.
          </p>
        </div>
      ) : null}
      <Button type="submit" disabled={loading || !content.trim()}>
        {loading ? "Posting..." : "Post"}
      </Button>
    </form>
  );
}
