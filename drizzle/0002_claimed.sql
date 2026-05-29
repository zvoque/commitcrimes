ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "claimed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "records_claimed_years_idx" ON "records" ("claimed", "total_years");
