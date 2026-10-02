import Link from "next/link";
import { CircleDot } from "lucide-react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto mb-8 flex max-w-2xl items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CircleDot className="size-4" />
          </div>
          <span className="font-semibold">DevCircle</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
