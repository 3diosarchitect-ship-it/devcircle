"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function JoinCommunityButton({
  communityId,
  joined: initialJoined,
}: {
  communityId: string;
  joined: boolean;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to join communities");
        return;
      }

      if (joined) {
        const { error } = await supabase
          .from("community_members")
          .delete()
          .eq("community_id", communityId)
          .eq("profile_id", user.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        setJoined(false);
        toast.success("Left community");
      } else {
        const { error } = await supabase.from("community_members").insert({
          community_id: communityId,
          profile_id: user.id,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        setJoined(true);
        toast.success("Joined community");
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={joined ? "secondary" : "default"}
      disabled={pending}
      onClick={toggle}
    >
      {joined ? "Joined" : "Join community"}
    </Button>
  );
}
