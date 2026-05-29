import { ImageResponse } from "next/og";
import { getCrimeRecord, isValidUsername } from "@/lib/github";
import { avatarDataUri } from "@/lib/avatar";

const PAPER = "#e3d6b8";
const INK = "#211b12";
const STAMP = "#a3282a";
const SUB = "#5a4f3d";
const CLEARED = "#3f6f3f";

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u")?.trim() ?? "";
  const record = isValidUsername(u) ? await getCrimeRecord(u).catch(() => null) : null;
  const avatar = record ? await avatarDataUri(record.avatarUrl) : null;

  const guilty = !!record && record.charges.length > 0;
  const sentence = record ? record.sentence.text : "NO RECORD FOUND";
  const lead = record?.sentence.lead?.title ?? "";
  const others = record && record.charges.length > 1 ? record.charges.length - 1 : 0;
  const top = record ? record.charges.slice(0, 2) : [];
  const booking = record?.bookingNumber ?? "CC-0000-000-XXXX";
  const stampText = guilty ? "GUILTY" : record ? "CLEARED" : "DISMISSED";
  const stampColor = guilty ? STAMP : CLEARED;

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
          fontFamily: "sans-serif",
          border: `14px solid ${INK}`,
          position: "relative",
        }}
      >
        {/* header band */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: INK,
            color: PAPER,
            padding: "16px 32px",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <span>Dept. of Version Control</span>
          <span>Permanent Record</span>
          <span style={{ fontSize: 18, opacity: 0.85 }}>{booking}</span>
        </div>

        {/* body */}
        <div style={{ display: "flex", alignItems: "center", gap: 40, padding: "40px 48px 0" }}>
          {avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              width={190}
              height={190}
              style={{ border: `6px solid ${INK}`, filter: "grayscale(1)", objectFit: "cover" }}
              alt=""
            />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, opacity: 0.75 }}>{`@${u.slice(0, 38) || "unknown"}`}</div>
            <div style={{ fontSize: 24, letterSpacing: 4, marginTop: 6, opacity: 0.65 }}>SENTENCED TO</div>
            <div
              style={{
                display: "flex",
                fontSize: guilty ? 70 : 54,
                fontWeight: 800,
                textTransform: "uppercase",
                color: guilty ? STAMP : INK,
                lineHeight: 1.02,
                maxWidth: 800,
              }}
            >
              {sentence}
            </div>
            {lead && (
              <div style={{ display: "flex", fontSize: 28, marginTop: 12, color: SUB }}>
                {`for ${lead}${others ? ` + ${others} more counts` : ""}`}
              </div>
            )}
          </div>
        </div>

        {/* charges strip */}
        {top.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "26px 48px 0" }}>
            {top.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 26, borderTop: `2px dashed ${SUB}`, paddingTop: 8 }}>
                <span>{c.title}</span>
                <span style={{ color: STAMP, fontWeight: 800 }}>{`${c.years}y`}</span>
              </div>
            ))}
          </div>
        )}

        {/* footer + fine print */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            padding: "0 48px 26px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontSize: 28,
            }}
          >
            <span style={{ fontWeight: 800, letterSpacing: 2 }}>COMMITCRIMES</span>
            <span style={{ opacity: 0.6 }}>commitcrimes.dev</span>
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 15, opacity: 0.5 }}>
            {`Filed in the District Court of Diff · not real charges or convictions · built from ${record?.deep ? "the subject's own public and private GitHub data" : "public GitHub data"} · not affiliated with GitHub, Inc.`}
          </div>
        </div>

        {/* verdict stamp */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 150,
            right: 60,
            transform: "rotate(-14deg)",
            border: `6px solid ${stampColor}`,
            color: stampColor,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: 4,
            padding: "4px 22px",
            opacity: 0.82,
          }}
        >
          {stampText}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
