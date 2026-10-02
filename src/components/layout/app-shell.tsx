"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Briefcase,
  Home,
  LogOut,
  Search,
  Settings,
  Users,
  UsersRound,
  CircleDot,
  User,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useState } from "react";
import type { Profile } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/communities", label: "Communities", icon: UsersRound },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/teammates", label: "Find Teammates", icon: Users },
  { href: "/people", label: "People", icon: CircleDot },
  { href: "/profile", label: "My Profile", icon: User },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/communities", label: "Communities", icon: UsersRound },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({
  children,
  profile,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  profile: Profile;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CircleDot className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">DevCircle</div>
            <div className="text-[10px] text-muted-foreground">
              Build. Connect. Get Opportunities.
            </div>
          </div>
        </Link>

        <NavLinks />

        <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Settings className="size-4" />
            Settings
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-4">
              <SheetTitle className="mb-4 text-left text-sm">DevCircle</SheetTitle>
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <form onSubmit={onSearch} className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 bg-secondary/50 pl-9 text-sm"
              aria-label="Search students, communities, opportunities"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => router.push("/notifications")}
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
              )}
            </Button>
            <Link href="/profile" className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/15 text-xs text-primary">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          {MOBILE_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-[4.5rem] truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
