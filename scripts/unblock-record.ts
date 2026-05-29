// One-off: undo an accidental /remove. Deletes a login from the opt-out
// denylist so it can be booked/claimed/published again. The record row itself
// is NOT restored here (claimed/deep records must be re-published by the owner
// via /deep, or re-booked publicly by visiting /u/<login>).
//
// Run: node --env-file=.env.local --import tsx scripts/unblock-record.ts <login>
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";

const login = (process.argv[2] || "zvoque").toLowerCase();

async function main() {
  const db = getDb();
  if (!db) {
    console.error("No DATABASE_URL — aborting.");
    process.exit(1);
  }
  const before = await db.execute(sql`SELECT login FROM removed_logins WHERE login = ${login}`);
  console.log(`removed_logins has "${login}": ${before.rowCount ? "yes" : "no"}`);
  await db.execute(sql`DELETE FROM removed_logins WHERE login = ${login}`);
  const rec = await db.execute(sql`SELECT login, claimed, featured, deep FROM records WHERE login = ${login}`);
  console.log(`un-blocked "${login}". records row exists: ${rec.rowCount ? "yes" : "no — owner must re-publish/re-book"}`);
  process.exit(0);
}

main();
