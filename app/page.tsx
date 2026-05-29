import type { Metadata } from "next";
import SuspectSearch from "@/components/SuspectSearch";
import SiteFooter from "@/components/SiteFooter";
import LookYourselfUp from "@/components/LookYourselfUp";
import BrandMark from "@/components/BrandMark";

const SITE = "https://commitcrimes.dev";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "CommitCrimes",
      description:
        "Satirical web app that turns a GitHub account's public activity into a mock criminal rap sheet.",
      publisher: { "@id": `${SITE}/#org` },
    },
    { "@type": "Organization", "@id": `${SITE}/#org`, name: "CommitCrimes", url: SITE },
    {
      "@type": "WebApplication",
      "@id": `${SITE}/#app`,
      name: "CommitCrimes",
      url: SITE,
      applicationCategory: "EntertainmentApplication",
      operatingSystem: "Any",
      description:
        "Parody tool that charges GitHub accounts with comedic crimes against version control, based on public git habits. Not affiliated with GitHub.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function Home() {
  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grain-overlay" />

      <BrandMark className="absolute left-5 top-5 z-20" />

      {/* faint oversized watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 select-none font-stencil text-[28vw] leading-none text-ink/[0.04] rotate-[8deg]"
      >
        GUILTY
      </div>

      <header className="relative z-10 mb-10 text-center">
        <div className="mb-3 inline-flex items-center border border-ink/50 px-3 py-1 text-[0.72rem] tracking-[0.36em] uppercase text-ink-soft">
          Department of Version Control
        </div>
        <h1 className="font-stencil text-6xl sm:text-7xl md:text-8xl leading-[0.85] text-ink">
          Commit
          <br />
          Crimes
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base sm:text-lg text-ink-soft">
          Every push leaves evidence. Type your handle, or anyone&apos;s, and get
          the rap sheet.
        </p>
      </header>

      <div className="relative z-10 flex w-full justify-center">
        <SuspectSearch />
      </div>

      <p className="relative z-10 mt-4 text-center text-xs text-ink-soft/70">
        Public data only. We read commit metadata, never your code.
      </p>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <LookYourselfUp />
        <a
          href="/wanted"
          className="text-ink-soft underline decoration-dotted underline-offset-4 hover:text-stamp"
        >
          See the Most Wanted →
        </a>
      </div>

      <SiteFooter />
    </main>
  );
}
