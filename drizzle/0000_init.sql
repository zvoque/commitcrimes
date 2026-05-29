CREATE TABLE IF NOT EXISTS "records" (
  "login" text PRIMARY KEY NOT NULL,
  "name" text,
  "avatar_url" text,
  "total_years" integer DEFAULT 0 NOT NULL,
  "lead_charge" text,
  "charges_count" integer DEFAULT 0 NOT NULL,
  "deep" boolean DEFAULT false NOT NULL,
  "data" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "records_total_years_idx" ON "records" ("total_years");
