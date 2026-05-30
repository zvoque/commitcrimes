import Link from "next/link";
import type { Metadata } from "next";
import { topWanted } from "@/lib/store";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "Most Wanted · CommitCrimes",
  description: "The worst offenders against version control, ranked by sentence.",
  alternates: { canonical: "/wanted" },
};

// Always reflect the latest bookings.
export const dynamic = "force-dynamic";

function commas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Mirror the engine: LIFE needs >=2 felonies ("Habitual Felon") AND >= 1500 yrs.
// Everyone else shows their raw years. Keep in sync with computeSentence.
function yearsLabel(totalYears: number, recordClass: string | null): string {
  if ((recordClass === "Habitual Felon" || recordClass === "Public Enemy") && totalYears >= 1500) {
    const lives = Math.floor(totalYears / 1500);
    return lives > 1 ? `${lives}× LIFE` : "LIFE";
  }
  return `${commas(totalYears)}y`;
}

export default async function WantedPage() {
  const wanted = await topWanted(50);

  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      <div className="grain-overlay" />

      <BrandMark className="relative z-10 mb-6 self-start" />

      <header className="relative z-10 mb-8 text-center">
        <h1 className="font-stencil text-5xl sm:text-6xl leading-none text-ink">Most Wanted</h1>
        <p className="mt-3 text-ink-soft">The worst offenders against version control.</p>
      </header>

      <div className="relative z-10 w-full max-w-2xl">
        {wanted.length === 0 ? (
          <div className="border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 text-center shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
            <p className="font-stencil text-3xl text-ink">No One Booked Yet</p>
            <p className="mt-3 text-ink-soft">
              The board is empty. Go incriminate someone.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp"
            >
              Run a record
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
            {wanted.map((w, i) => (
              <li
                key={w.login}
                className="flex items-center gap-4 border-b border-dashed border-ink/30 px-4 py-3 last:border-b-0"
              >
                <span className="w-8 shrink-0 text-center font-stencil text-xl text-ink-soft">
                  {i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.avatarUrl ?? ""}
                  alt=""
                  className="mugshot h-11 w-11 shrink-0 border border-ink object-cover"
                />
                <Link href={`/u/${w.login}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-stencil text-lg leading-tight text-ink hover:text-stamp">
                    <span className="truncate">@{w.login}</span>
                    {w.claimed && (
                      <span
                        title="Verified: claimed by the account owner"
                        aria-label="verified"
                        className="shrink-0 text-[#3f6f3f]"
                      >
                        ✓
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {w.recordClass && (
                      <span
                        className={`mr-1 uppercase tracking-wide ${
                          /felon|public enemy/i.test(w.recordClass)
                            ? "font-stencil text-stamp"
                            : "text-ink-soft"
                        }`}
                      >
                        {/public enemy/i.test(w.recordClass) ? `★ ${w.recordClass}` : w.recordClass} ·
                      </span>
                    )}
                    {w.leadCharge ?? "·"}
                    {w.deep && (
                      <span className="ml-1 text-[#3f6f3f]">· deep record</span>
                    )}
                  </p>
                </Link>
                <span className="shrink-0 text-right">
                  <span className="font-stencil text-xl text-stamp">{yearsLabel(w.totalYears, w.recordClass)}</span>
                  <span className="block text-[0.72rem] uppercase tracking-[0.15em] text-ink-soft">
                    {w.chargesCount} count{w.chargesCount === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
