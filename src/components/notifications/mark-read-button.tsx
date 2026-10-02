"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function MarkReadButton() {
  const router = useRouter();

  async function markAll() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("profile_id", user.id)
      .eq("read", false);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as read");
      router.refresh();
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={markAll}>
      Mark all read
    </Button>
  );
}
