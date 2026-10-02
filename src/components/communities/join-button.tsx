"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function JoinCommunityButton({
  communityId,
  communityName,
  initiallyJoined,
}: {
  communityId: string;
  communityName: string;
  initiallyJoined: boolean;
}) {
  const [joined, setJoined] = useState(initiallyJoined);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in");
      setLoading(false);
      return;
    }

    try {
      if (joined) {
        const { error } = await supabase
          .from("community_members")
          .delete()
          .eq("community_id", communityId)
          .eq("profile_id", user.id);
        if (error) throw error;
        setJoined(false);
        toast.success(`Left ${communityName}`);
      } else {
        const { error } = await supabase.from("community_members").insert({
          community_id: communityId,
          profile_id: user.id,
        });
        if (error) throw error;
        await supabase.from("notifications").insert({
          profile_id: user.id,
          title: `You joined ${communityName}`,
          body: "Welcome to the community.",
        });
        setJoined(true);
        toast.success(`Joined ${communityName}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={joined ? "outline" : "default"}
      disabled={loading}
      onClick={toggle}
    >
      {joined ? "Joined" : "Join"}
    </Button>
  );
}
