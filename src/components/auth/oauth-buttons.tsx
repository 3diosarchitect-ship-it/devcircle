"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path fill="none" d="M0 0h24v24H0z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .26.18.59.69.48A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

export function OAuthButtons({
  next = "/dashboard",
  mode = "signin",
}: {
  next?: string;
  mode?: "signin" | "signup";
}) {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);

  async function startOAuth(provider: "google" | "github") {
    setLoading(provider);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes: provider === "github" ? "read:user user:email" : undefined,
          queryParams:
            provider === "google"
              ? { access_type: "offline", prompt: "consent" }
              : undefined,
        },
      });
      if (error) throw error;
    } catch (err) {
      setLoading(null);
      toast.error(
        err instanceof Error
          ? err.message
          : `Could not start ${provider} sign-in. Enable the provider in Supabase Auth.`
      );
    }
  }

  const label = mode === "signup" ? "Continue" : "Continue";

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2"
        disabled={!!loading}
        onClick={() => startOAuth("google")}
      >
        {loading === "google" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        {label} with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2"
        disabled={!!loading}
        onClick={() => startOAuth("github")}
      >
        {loading === "github" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GithubIcon className="size-4" />
        )}
        {label} with GitHub
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        We create your DevCircle profile from your name, photo
        {mode === "signup" ? ", and GitHub URL" : " / GitHub"}.
      </p>
    </div>
  );
}
