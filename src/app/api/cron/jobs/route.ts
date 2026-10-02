import { NextResponse } from "next/server";
import { ingestJobs } from "@/lib/jobs/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hourly job bot.
 * Auth: Authorization: Bearer <CRON_SECRET>  OR  ?secret=<CRON_SECRET>
 * Vercel Cron hits this every hour when vercel.json is configured.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const q = url.searchParams.get("secret");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not set in env" },
      { status: 500 }
    );
  }
  if (bearer !== secret && q !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Remotive asks for few daily calls — include at most every 6 hours when cron is hourly
  const hour = new Date().getUTCHours();
  const includeRemotive = hour % 6 === 0 || url.searchParams.get("remotive") === "1";

  try {
    const result = await ingestJobs({
      includeRemotive,
      maxInsert: 40,
      postToCommunities: true,
    });
    return NextResponse.json({ ok: true, includeRemotive, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
