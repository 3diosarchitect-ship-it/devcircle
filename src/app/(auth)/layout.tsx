import Link from "next/link";
import { CircleDot } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <CircleDot className="size-5" />
        </div>
        <div>
          <div className="font-semibold">DevCircle</div>
          <div className="text-[10px] text-muted-foreground">
            Build. Connect. Get Opportunities.
          </div>
        </div>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
