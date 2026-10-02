/**
 * Manual / local run of the jobs bot (same as hourly cron).
 *   npm run ingest-jobs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

async function main() {
  const { ingestJobs } = await import("../lib/jobs/ingest");
  console.log("Fetching real jobs from Arbeitnow + Remote OK + Remotive…");
  const result = await ingestJobs({
    includeRemotive: true,
    maxInsert: 50,
    postToCommunities: true,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
