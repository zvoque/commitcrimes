CREATE TABLE IF NOT EXISTS "removed_logins" (
  "login" text PRIMARY KEY NOT NULL,
  "removed_at" timestamp with time zone DEFAULT now() NOT NULL
);
