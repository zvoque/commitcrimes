// Neon Postgres via Drizzle (neon-http driver — fetch-based, works in Node and
// at the edge). The whole layer is optional: with no DATABASE_URL the client is
// null and every store call no-ops, so the app runs fine without a database.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

export function getDb(): DB | null {
  if (!isDbConfigured()) return null;
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
