-- Curated Most Wanted seed flag. Distinct from `claimed` so claimed stays an
-- honest signal of a real opt-in; the board shows claimed OR featured.
ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false;
