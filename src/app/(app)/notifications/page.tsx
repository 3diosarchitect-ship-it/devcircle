import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { Bell } from "lucide-react";
import { MarkReadButton } from "@/components/notifications/mark-read-button";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Jobs in your communities, joins, matches, and teammate activity."
      >
        <MarkReadButton />
      </PageHeader>

      {!notifications?.length ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="When a job is posted in a community you joined, it shows up here."
          actionLabel="Go to Dashboard"
          actionHref="/dashboard"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass-card flex items-start justify-between gap-3 p-4 ${
                n.read ? "opacity-70" : ""
              }`}
            >
              <div>
                <div className="font-medium">{n.title}</div>
                {n.body && (
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
              {n.link && (
                <Link
                  href={n.link}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Open
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
