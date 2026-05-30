import { ImageResponse } from "next/og";
import { getCrimeRecord, isValidUsername } from "@/lib/github";
import { avatarDataUri } from "@/lib/avatar";
import { chargeClassLabel } from "@/lib/chargeLabel";
import { ELITE_B64, STENCIL_B64 } from "./fonts";

// Full detailed rap sheet as an image — device-independent (same on mobile and
// desktop), used for download + share. Mirrors components/RapSheet.tsx.

const PAPER = "#e3d6b8";
const INK = "#211b12";
const SOFT = "#5a4f3d";
const STAMP = "#a3282a";
const CLEARED = "#3f6f3f";

const W = 760;

// Decode the base64-embedded fonts once per isolate.
function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
let fontCache: [ArrayBuffer, ArrayBuffer] | null = null;
function loadFonts(): [ArrayBuffer, ArrayBuffer] {
  if (!fontCache) fontCache = [b64ToArrayBuffer(ELITE_B64), b64ToArrayBuffer(STENCIL_B64)];
  return fontCache;
}

// Hard-truncate a handle for the image. Satori's text-overflow:ellipsis is
// unreliable, and the embedded Stencil font may lack a "…" glyph, so trim the
// string with ASCII dots. Inmate column is tight (200px), footer has more room.
function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}

// Dotted-leader dossier row: label … value
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", fontSize: 17, color: INK }}>
      <span style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: SOFT, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ flex: 1, margin: "0 8px", borderBottom: `2px dashed ${SOFT}`, transform: "translateY(-5px)" }} />
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u")?.trim() ?? "";
  const record = isValidUsername(u) ? await getCrimeRecord(u).catch(() => null) : null;

  if (!record) {
    return new Response("Not found", { status: 404 });
  }

  const { sentence, charges, stats } = record;
  const guilty = charges.length > 0;
  const avatar = await avatarDataUri(record.avatarUrl, 240);
  const verdict = guilty ? "GUILTY" : "CLEARED";
  const verdictColor = guilty ? STAMP : CLEARED;
  const rcColor = !record.recordClass
    ? SOFT
    : /felon|public enemy/i.test(record.recordClass)
      ? STAMP
      : /model citizen/i.test(record.recordClass)
        ? CLEARED
        : SOFT;

  // Compute canvas height from content so nothing clips and there's no big gap.
  const chargesH = guilty ? charges.length * 60 + 34 : 70;
  const height =
    360 + 96 + chargesH + 150 + (record.deep ? 26 : 0) + (record.recordClass ? 34 : 0);

  const [eliteData, stencilData] = loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          fontFamily: "Elite",
          border: `3px solid ${INK}`,
        }}
      >
        {/* Top band */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: INK,
            color: PAPER,
            padding: "10px 20px",
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", opacity: 0.85 }}>
            Dept. of Version Control
          </span>
          <span style={{ fontFamily: "Stencil", fontSize: 15, letterSpacing: 4, textTransform: "uppercase" }}>
            Permanent Record
          </span>
          <span style={{ fontSize: 12, letterSpacing: 1, opacity: 0.9 }}>{record.bookingNumber}</span>
        </div>

        {/* Body: mugshot + dossier */}
        <div style={{ display: "flex", gap: 20, padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 200 }}>
            <div style={{ display: "flex", position: "relative", border: `2px solid ${INK}` }}>
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} width={196} height={196} style={{ filter: "grayscale(1)", objectFit: "cover" }} alt="" />
              ) : (
                <div style={{ display: "flex", width: 196, height: 196, background: "#cdbf9c" }} />
              )}
              <div
                style={{
                  position: "absolute",
                  left: 4,
                  top: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: 11,
                  color: PAPER,
                }}
              >
                {["8", "6", "4", "2", "0"].map((n) => (
                  <span key={n}>{n}-</span>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: INK,
                color: PAPER,
                padding: "5px 8px",
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.75 }}>Inmate</span>
              <span style={{ fontFamily: "Stencil", fontSize: 14 }}>@{trunc(record.login, 14)}</span>
            </div>
            <span style={{ marginTop: 4, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: SOFT, textAlign: "center" }}>
              HT: {stats.heightYears} yrs on record
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "Stencil", fontSize: 34, lineHeight: 1, color: INK }}>{record.name}</span>
              <span
                style={{
                  fontFamily: "Stencil",
                  fontSize: 30,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: verdictColor,
                  border: `4px solid ${verdictColor}`,
                  padding: "2px 12px",
                }}
              >
                {verdict}
              </span>
            </div>
            {record.recordClass && (
              <span
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: rcColor,
                  border: `1px solid ${rcColor}`,
                  padding: "2px 6px",
                  marginBottom: 8,
                }}
              >
                {record.recordClass}
              </span>
            )}
            {record.deep && (
              <span
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: CLEARED,
                  border: `1px solid ${CLEARED}`,
                  padding: "2px 6px",
                  marginBottom: 8,
                }}
              >
                ✓ Deep Record
              </span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Row label="A.K.A." value={stats.aliases.join(", ")} />
              <Row label="M.O." value={stats.modusOperandi.join(", ")} />
              <Row label="Member Since" value={String(stats.memberSince)} />
              <Row label="Known Associates" value={`${stats.knownAssociates} followers`} />
              <Row label="Prior Convictions" value={`${stats.priorConvictions} repos`} />
              <Row label="Status" value={guilty ? "CONVICTED" : "CLEARED"} />
            </div>
          </div>
        </div>

        {/* Sentence banner */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "0 20px",
            padding: "8px 0",
            borderTop: `4px solid ${guilty ? STAMP : INK}`,
            borderBottom: `4px solid ${guilty ? STAMP : INK}`,
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: 5, textTransform: "uppercase", color: SOFT }}>Sentence</span>
          <span style={{ fontFamily: "Stencil", fontSize: 30, textTransform: "uppercase", color: guilty ? STAMP : INK }}>
            {sentence.text}
          </span>
        </div>

        {/* Charges */}
        <div style={{ display: "flex", flexDirection: "column", padding: "8px 20px 4px" }}>
          <span style={{ fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: SOFT, marginBottom: 6 }}>
            {guilty ? `Charges filed · ${charges.length} count(s)` : "No charges"}
          </span>
          {guilty ? (
            charges.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : `1px dashed rgba(33,27,18,0.4)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ background: INK, color: PAPER, fontSize: 11, padding: "2px 6px", whiteSpace: "nowrap" }}>
                    {c.statute.replace(/\./g, "-")}
                  </span>
                  <span style={{ fontFamily: "Stencil", fontSize: 18, textTransform: "uppercase", marginLeft: 10 }}>
                    {c.title}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      marginLeft: 8,
                      fontSize: 9,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      padding: "1px 4px",
                      color: (c.severity ?? "misdemeanor") === "felony" ? STAMP : SOFT,
                      border: `1px solid ${(c.severity ?? "misdemeanor") === "felony" ? STAMP : SOFT}`,
                    }}
                  >
                    {chargeClassLabel(c)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: "Stencil", fontSize: 18, color: STAMP }}>{c.years}y</span>
                </div>
                <span style={{ fontSize: 14, fontStyle: "italic", color: SOFT, marginTop: 2 }}>{c.detail}</span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: 15, fontStyle: "italic", color: SOFT, textAlign: "center", padding: "12px 0" }}>
              Certified clean. Cleaner than 98% of developers. Suspiciously so.
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
            padding: "10px 20px",
            borderTop: `2px solid ${INK}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: SOFT }}>
              The State of GitHub v.
            </span>
            <span style={{ fontFamily: "Stencil", fontSize: 18, margin: "2px 0" }}>@{trunc(record.login, 24)}</span>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: SOFT }}>commitcrimes.dev</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", height: 30 }}>
            {"13212312113132212311321312213".split("").map((d, i) => (
              <span key={i} style={{ width: Number(d), height: "100%", background: INK, marginLeft: 2 }} />
            ))}
          </div>
        </div>

        {/* Fine print */}
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 20px", borderTop: `1px solid rgba(33,27,18,0.25)`, background: "rgba(20,16,10,0.05)" }}>
          <span style={{ fontSize: 11, color: SOFT, textAlign: "center" }}>
            {record.deep
              ? "Not real charges or convictions · built from the subject's own public and private GitHub data · not affiliated with GitHub, Inc."
              : "Not real charges or convictions · built from public GitHub data · not affiliated with GitHub, Inc."}
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height,
      fonts: [
        { name: "Elite", data: eliteData, weight: 400, style: "normal" },
        { name: "Stencil", data: stencilData, weight: 400, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
