// One-off: seed the Most Wanted board with a curated set of well-known public
// developer accounts so it isn't empty at launch. These are flagged `featured`
// (not `claimed`) — public-data parody of public figures, no implied opt-in.
//
// Run (Node 20.6+, loads .env.local for DATABASE_URL + GITHUB_TOKEN):
//   node --env-file=.env.local --import tsx scripts/seed-featured.ts
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";
import { getCrimeRecord } from "../lib/github";
import { featureRecord } from "../lib/store";

const HANDLES = [
  "torvalds", "gaearon", "sindresorhus", "tj", "antirez", "yyx990803",
  "karpathy", "mojombo", "defunkt", "addyosmani", "kentcdodds", "getify",
  "wesbos", "bradfitz", "mitchellh", "fabpot", "taylorotwell", "dhh",
  "jakevdp", "tpope", "developit", "ry", "mxstbr", "kelseyhightower",
];

async function main() {
  const db = getDb();
  if (!db) {
    console.error("No DATABASE_URL — aborting.");
    process.exit(1);
  }
  // Ensure the column exists (idempotent) before featureRecord writes to it.
  await db.execute(
    sql`ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`
  );

  let ok = 0;
  let skip = 0;
  for (const h of HANDLES) {
    try {
      const rec = await getCrimeRecord(h);
      if (rec && rec.charges.length > 0) {
        await featureRecord(rec);
        console.log(`✓ ${h.padEnd(16)} ${rec.sentence.text}  (${rec.charges.length} charges)`);
        ok++;
      } else {
        console.log(`· ${h.padEnd(16)} ${rec ? "no charges, skipped" : "no record, skipped"}`);
        skip++;
      }
    } catch (e) {
      console.log(`! ${h.padEnd(16)} error: ${(e as Error).message}`);
      skip++;
    }
  }
  console.log(`\nDone: ${ok} featured, ${skip} skipped.`);
  process.exit(0);
}

main();
