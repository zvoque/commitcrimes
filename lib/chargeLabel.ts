import type { Charge } from "./types";

// Presentation-only label for a charge's class tag. Kept in its own tiny module
// (not charges.ts) so the client bundle that renders RapSheet doesn't pull in
// the whole charge engine.
export function chargeClassLabel(c: Charge): string {
  // No "°" — the embedded Satori fonts may not carry that glyph (same trap as
  // the ellipsis). Digits + middot only, both render in the embedded fonts.
  if ((c.severity ?? "misdemeanor") === "felony") {
    return `FELONY${c.degree ? ` ${c.degree}` : ""}${c.aggravated ? " · AGG" : ""}`;
  }
  return "MISDEMEANOR";
}
