"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export function NotificationsList({
  notifications,
  profileId,
}: {
  notifications: Notification[];
  profileId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAllRead() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("profile_id", profileId)
        .eq("read", false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("All caught up");
      router.refresh();
    });
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="When communities, matches, or teammates reach out, you'll see it here."
        actionLabel="Explore opportunities"
        actionHref="/opportunities"
      />
    );
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {unread > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card/40">
        {notifications.map((n) => (
          <li key={n.id}>
            <div
              className={cn(
                "flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                !n.read && "bg-emerald-500/5"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                {n.body ? (
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {n.link ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={n.link} onClick={() => markRead(n.id)}>
                      Open
                    </Link>
                  </Button>
                ) : null}
                {!n.read ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
