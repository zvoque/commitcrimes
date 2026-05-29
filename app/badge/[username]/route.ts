import { getCrimeRecord, isValidUsername } from "@/lib/github";
import { getCachedRecord } from "@/lib/store";
import type { CrimeRecord } from "@/lib/types";

const CACHE = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";
const FRESH_MS = 6 * 60 * 60 * 1000; // serve cached badge if pulled within 6h

function svgResponse(svg: string, status = 200) {
  return new Response(svg, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE,
    },
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const THEMES = {
  dark: { bg: "#211b12", fg: "#e3d6b8", accent: "#b9484a", sub: "#b6a98a" },
  light: { bg: "#e3d6b8", fg: "#211b12", accent: "#a3282a", sub: "#5a4f3d" },
} as const;

// Clean cuffs glyph: two rings + a chain link, stroked, transparent background
// (just the cuffs, no tile). Drawn in a 24x24 box, scaled to s.
function cuffsGlyph(x: number, y: number, s: number, color: string): string {
  const k = s / 24;
  return (
    `<g transform="translate(${x},${y}) scale(${k})" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
    `<circle cx="7" cy="16" r="5.1"/>` +
    `<circle cx="17.4" cy="16" r="5.1"/>` +
    `<path d="M9.4 11.4 C10.7 7.7 13.5 7.7 14.8 11.4"/>` +
    `<path d="M10.4 9.1 L13.8 9.1"/>` +
    `</g>`
  );
}

function shortSentence(record: CrimeRecord): { val: string; lead: string } {
  if (record.charges.length === 0) return { val: "CLEARED", lead: "no priors" };
  const total = record.sentence.totalYears;
  const val = total >= 99 ? `${Math.floor(total / 99)}×LIFE` : `${total}y`;
  const lead = record.sentence.lead?.title ?? "version control";
  return { val, lead };
}

// Single-tone monospace pill. No two-tone segment boundary (the previous version
// estimated text width to place a color split, which misaligned and looked
// broken). One background; emphasis comes from colored text. Monospace makes the
// width estimate reliable and matches the typewriter brand.
function pill(record: CrimeRecord | null, themeKey: keyof typeof THEMES): string {
  const t = THEMES[themeKey];
  const h = 28;
  const fs = 12;
  const pad = 12;
  const cw = fs * 0.62; // monospace advance ≈ 0.62em

  const label = "COMMITCRIMES";
  let val: string;
  let lead = "";
  let valColor: string;
  if (!record) {
    val = "NO RECORD";
    valColor = t.sub;
  } else if (record.charges.length === 0) {
    val = "CLEARED";
    lead = "no priors";
    valColor = "#5a8a5a";
  } else {
    const s = shortSentence(record);
    val = s.val;
    lead = s.lead.length > 22 ? s.lead.slice(0, 21) + "…" : s.lead;
    valColor = t.accent;
  }

  const sep = " · ";
  const plain = label + sep + val + (lead ? sep + lead : "");
  const iconSize = 18;
  const iconW = iconSize + 7; // glyph + gap before text
  const textX = pad + iconW;
  const w = Math.ceil(plain.length * cw) + iconW + pad * 2;
  const font = `font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="${fs}"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="${esc(plain)}">
  <rect width="${w}" height="${h}" rx="3" fill="${t.bg}"/>
  <rect width="${w}" height="${h}" rx="3" fill="none" stroke="${t.fg}" stroke-opacity="0.3"/>
  ${cuffsGlyph(pad, (h - iconSize) / 2, iconSize, t.fg)}
  <text x="${textX}" y="19" ${font}>
    <tspan fill="${t.fg}" font-weight="bold">${esc(label)}</tspan><tspan fill="${t.sub}">${sep}</tspan><tspan fill="${valColor}" font-weight="bold">${esc(val)}</tspan>${lead ? `<tspan fill="${t.sub}">${sep}</tspan><tspan fill="${t.fg}">${esc(lead)}</tspan>` : ""}
  </text>
</svg>`;
}

function card(record: CrimeRecord | null, login: string, themeKey: keyof typeof THEMES): string {
  const t = THEMES[themeKey];
  const w = 460;
  const h = 200;

  if (!record) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${t.bg}" stroke="${t.fg}" stroke-width="2"/>
  <text x="24" y="44" font-family="Verdana,sans-serif" font-size="22" font-weight="bold" fill="${t.fg}">CASE DISMISSED</text>
  <text x="24" y="74" font-family="Verdana,sans-serif" font-size="13" fill="${t.sub}">No record found for @${esc(login)}</text>
</svg>`;
  }

  const { val } = shortSentence(record);
  const top = record.charges.slice(0, 3);
  const guilty = record.charges.length > 0;
  const sentColor = guilty ? t.accent : "#3f6f3f";

  const rows = top
    .map(
      (c, i) =>
        `<text x="24" y="${128 + i * 22}" font-family="Verdana,sans-serif" font-size="13" fill="${t.fg}">• ${esc(c.title)} <tspan fill="${t.accent}" font-weight="bold">${c.years}y</tspan></text>`
    )
    .join("\n  ");

  const body = guilty
    ? rows
    : `<text x="24" y="128" font-family="Verdana,sans-serif" font-size="13" fill="${t.sub}">Suspiciously clean. No priors on record.</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${t.bg}" stroke="${t.fg}" stroke-width="2"/>
  <rect width="${w}" height="34" fill="${t.fg}"/>
  ${cuffsGlyph(12, 6, 22, t.bg)}
  <text x="44" y="23" font-family="Verdana,sans-serif" font-size="13" font-weight="bold" fill="${t.bg}" letter-spacing="2">COMMITCRIMES · PERMANENT RECORD</text>
  <text x="24" y="68" font-family="Verdana,sans-serif" font-size="20" font-weight="bold" fill="${t.fg}">@${esc(login)}</text>
  <text x="24" y="98" font-family="Verdana,sans-serif" font-size="13" fill="${t.sub}">SENTENCED TO</text>
  <text x="${w - 24}" y="68" text-anchor="end" font-family="Verdana,sans-serif" font-size="30" font-weight="bold" fill="${sentColor}">${esc(guilty ? val : "CLEARED")}</text>
  ${body}
  <text x="${w - 24}" y="${h - 14}" text-anchor="end" font-family="Verdana,sans-serif" font-size="11" fill="${t.sub}">commitcrimes.dev · not a real record</text>
</svg>`;
}

export async function GET(
  req: Request,
  ctx: RouteContext<"/badge/[username]">
) {
  const { username } = await ctx.params;
  const login = username.replace(/\.svg$/i, "").trim();

  const url = new URL(req.url);
  const style = url.searchParams.get("style") === "card" ? "card" : "pill";
  const themeKey = url.searchParams.get("theme") === "dark" ? "dark" : "light";

  if (!isValidUsername(login)) {
    const svg = style === "card" ? card(null, login, themeKey) : pill(null, themeKey);
    return svgResponse(svg, 200);
  }

  // Read-through cache: a fresh cached pull avoids hitting GitHub on every
  // badge render (GitHub Camo fetches these a lot). Recompute when stale/missing.
  let record: CrimeRecord | null = null;
  const cached = await getCachedRecord(login);
  if (cached && Date.now() - cached.updatedAt.getTime() < FRESH_MS) {
    record = cached.record;
  } else {
    try {
      record = await getCrimeRecord(login);
    } catch {
      record = cached?.record ?? null; // fall back to stale cache on failure
    }
  }

  const svg =
    style === "card" ? card(record, login, themeKey) : pill(record, themeKey);
  return svgResponse(svg);
}
