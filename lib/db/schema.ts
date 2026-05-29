import { pgTable, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { CrimeRecord } from "../types";

// One row per GitHub account we've booked. `login` is stored lowercased (PK)
// since GitHub handles are case-insensitive. `data` holds the full computed
// record; the flat columns exist for the leaderboard query.
export const records = pgTable(
  "records",
  {
    login: text("login").primaryKey(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    totalYears: integer("total_years").notNull().default(0),
    leadCharge: text("lead_charge"),
    chargesCount: integer("charges_count").notNull().default(0),
    deep: boolean("deep").notNull().default(false),
    // Every looked-up login is cached here (24h TTL). `claimed` gates Most Wanted
    // + badge: only the account owner who signed in and claimed shows on the board.
    claimed: boolean("claimed").notNull().default(false),
    // Curated seed for the Most Wanted board (well-known public accounts) so it
    // isn't empty. Shown alongside claimed records; distinct from `claimed` so
    // "claimed" stays an honest signal of a real opt-in.
    featured: boolean("featured").notNull().default(false),
    data: jsonb("data").$type<CrimeRecord>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("records_claimed_years_idx").on(t.claimed, t.totalYears)]
);

export type RecordRow = typeof records.$inferSelect;

// Opt-out / right-to-erasure denylist. A login here is removed from `records`
// and blocked from future booking (no re-cache, page + badge refuse).
export const removedLogins = pgTable("removed_logins", {
  login: text("login").primaryKey(),
  removedAt: timestamp("removed_at", { withTimezone: true }).notNull().defaultNow(),
});
