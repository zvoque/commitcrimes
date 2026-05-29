// Read-through cache + leaderboard over the records table.
//
// Two concepts on one row:
//   - cached: every looked-up login is stored (24h TTL) so we don't re-hit
//     GitHub per view. This decouples GitHub load from traffic.
//   - claimed: only the signed-in owner who claimed shows on Most Wanted / gets
//     a badge. `cacheRecord` never touches the flag; `claimRecord` sets it.
//
// Every function is best-effort and degrades to a no-op / empty result when the
// database isn't configured or a query fails — the store must never break a pull.
import { and, desc, eq, gt, or } from "drizzle-orm";
import { getDb } from "./db";
import { records, removedLogins } from "./db/schema";
import type { CrimeRecord } from "./types";

export interface CachedRecord {
  record: CrimeRecord;
  updatedAt: Date;
}

export async function getCachedRecord(login: string): Promise<CachedRecord | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({ data: records.data, updatedAt: records.updatedAt })
      .from(records)
      .where(eq(records.login, login.toLowerCase()))
      .limit(1);
    if (!rows.length) return null;
    return { record: rows[0].data, updatedAt: rows[0].updatedAt };
  } catch {
    return null;
  }
}

function flatCols(record: CrimeRecord) {
  return {
    name: record.name,
    avatarUrl: record.avatarUrl,
    totalYears: record.sentence.totalYears,
    leadCharge: record.sentence.lead?.title ?? null,
    chargesCount: record.charges.length,
    data: record,
    updatedAt: new Date(),
  };
}

// Cache a freshly computed PUBLIC record (read-through). Preserves `claimed` on
// conflict. Deep/private records are never cached here. Also never overwrites a
// row that holds a PUBLISHED deep record (defensive against a race with publish;
// getCrimeRecord already serves deep rows stickily without recomputing).
export async function cacheRecord(record: CrimeRecord): Promise<void> {
  const db = getDb();
  if (!db || record.deep) return;
  const key = record.login.toLowerCase();
  try {
    const existing = await db
      .select({ deep: records.deep })
      .from(records)
      .where(eq(records.login, key))
      .limit(1);
    if (existing[0]?.deep) return; // don't clobber a published deep record
  } catch {
    /* proceed best-effort */
  }
  const cols = flatCols(record);
  try {
    await db
      .insert(records)
      .values({ login: key, ...cols })
      .onConflictDoUpdate({ target: records.login, set: cols });
  } catch {
    /* best-effort */
  }
}

// Publish the owner's OWN deep record to Most Wanted (opt-in, default off). The
// caller MUST pass a sanitized record (see sanitizeDeepRecord) — only sentence,
// charge titles, and counts are stored, never repo names or commit text. Sets
// claimed + deep; the row is then sticky (cacheRecord won't overwrite it and
// getCrimeRecord serves it without recomputing public data).
export async function publishDeepRecord(record: CrimeRecord): Promise<void> {
  const db = getDb();
  if (!db) return;
  const cols = flatCols(record);
  try {
    await db
      .insert(records)
      .values({ login: record.login.toLowerCase(), claimed: true, deep: true, ...cols })
      .onConflictDoUpdate({ target: records.login, set: { ...cols, claimed: true, deep: true } });
  } catch {
    /* best-effort */
  }
}

// Claim YOUR OWN record: same as cache, but flips `claimed` so it appears on
// Most Wanted and unlocks the badge.
export async function claimRecord(record: CrimeRecord): Promise<void> {
  const db = getDb();
  if (!db || record.deep) return;
  const key = record.login.toLowerCase();
  try {
    const existing = await db
      .select({ deep: records.deep })
      .from(records)
      .where(eq(records.login, key))
      .limit(1);
    if (existing[0]?.deep) return; // a published deep record outranks a public claim
  } catch {
    /* proceed best-effort */
  }
  const cols = flatCols(record);
  try {
    await db
      .insert(records)
      .values({ login: key, claimed: true, ...cols })
      .onConflictDoUpdate({ target: records.login, set: { ...cols, claimed: true } });
  } catch {
    /* best-effort */
  }
}

export async function isClaimed(login: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const rows = await db
      .select({ claimed: records.claimed })
      .from(records)
      .where(eq(records.login, login.toLowerCase()))
      .limit(1);
    return rows[0]?.claimed ?? false;
  } catch {
    return false;
  }
}

// Opt-out denylist. Returns false (allow) when DB unconfigured or on error.
export async function isRemoved(login: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const rows = await db
      .select({ login: removedLogins.login })
      .from(removedLogins)
      .where(eq(removedLogins.login, login.toLowerCase()))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Erase a record and block it from future booking. Returns true on success.
export async function removeRecord(login: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const key = login.toLowerCase();
  try {
    await db.delete(records).where(eq(records.login, key));
    await db
      .insert(removedLogins)
      .values({ login: key })
      .onConflictDoNothing({ target: removedLogins.login });
    return true;
  } catch {
    return false;
  }
}

export interface WantedEntry {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  totalYears: number;
  leadCharge: string | null;
  chargesCount: number;
  deep: boolean;
  claimed: boolean;
}

// Most Wanted = opt-in claimed offenders + the curated featured seed, ranked by
// sentence. Both must have at least one charge to appear.
export async function topWanted(limit = 50): Promise<WantedEntry[]> {
  const db = getDb();
  if (!db) return [];
  try {
    return await db
      .select({
        login: records.login,
        name: records.name,
        avatarUrl: records.avatarUrl,
        totalYears: records.totalYears,
        leadCharge: records.leadCharge,
        chargesCount: records.chargesCount,
        deep: records.deep,
        claimed: records.claimed,
      })
      .from(records)
      .where(
        and(
          or(eq(records.claimed, true), eq(records.featured, true)),
          gt(records.chargesCount, 0)
        )
      )
      .orderBy(desc(records.totalYears))
      .limit(limit);
  } catch {
    return [];
  }
}

// Mark a (public) record as featured for the curated Most Wanted seed. Like
// claimRecord but flips `featured` instead of `claimed`, so it never implies a
// real opt-in. Used only by the one-off seed script.
export async function featureRecord(record: CrimeRecord): Promise<void> {
  const db = getDb();
  if (!db || record.deep) return;
  const cols = flatCols(record);
  try {
    await db
      .insert(records)
      .values({ login: record.login.toLowerCase(), featured: true, ...cols })
      .onConflictDoUpdate({ target: records.login, set: { ...cols, featured: true } });
  } catch {
    /* best-effort */
  }
}
