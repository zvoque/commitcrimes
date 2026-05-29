import { ImageResponse } from "next/og";
import { cuffsTile } from "./_ogAssets";

export const alt = "CommitCrimes — your git habits, prosecuted";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Sample charges (real engine titles/descriptions) — a teaser sheet, not a real person.
const SAMPLE = [
  { title: "Reckless Endangerment", detail: "Unprotected pushes straight to main", count: 4, years: "24y" },
  { title: "Obstruction of Clarity", detail: 'Commits that said nothing: "fix", "wip", "."', count: 17, years: "18y" },
  { title: "Disturbing the Peace", detail: "Commits logged between 1 and 4 AM", count: 11, years: "12y" },
];

// Default share card for the home page and any route without its own OG image.
// (/u/[username] overrides this with its rap-sheet card.)
export default function OpengraphImage() {
  const paper = "#e3d6b8";
  const sheet = "#ece1c6";
  const ink = "#211b12";
  const stamp = "#a3282a";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: paper,
          color: ink,
          fontFamily: "sans-serif",
          border: `16px solid ${ink}`,
          padding: "28px 52px 30px",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 8, textTransform: "uppercase", opacity: 0.7 }}>
          Department of Version Control
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 26 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cuffsTile} alt="" width={108} height={108} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
              COMMITCRIMES
            </div>
            <div style={{ display: "flex", fontSize: 28, marginTop: 6, marginLeft: 6, color: stamp, fontWeight: 700 }}>
              Your git habits, prosecuted.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 16,
            border: `3px solid ${ink}`,
            background: sheet,
            padding: "4px 26px",
          }}
        >
          {SAMPLE.map((c) => (
            <div
              key={c.title}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid rgba(33,27,18,0.25)`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 24 }}>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{c.title}</div>
                <div style={{ display: "flex", fontSize: 19, opacity: 0.6, marginTop: 2 }}>{c.detail}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: stamp }}>{c.years}</div>
                <div style={{ display: "flex", fontSize: 16, letterSpacing: 2, opacity: 0.55, textTransform: "uppercase" }}>
                  {c.count} counts
                </div>
              </div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 0 8px",
            }}
          >
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.7 }}>
              Total Sentence
            </div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>54 years</div>
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 24,
            opacity: 0.7,
          }}
        >
          commitcrimes.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
