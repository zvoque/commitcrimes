import type { Metadata } from "next";
import Link from "next/link";
import SuspectSearch from "@/components/SuspectSearch";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";
import LookYourselfUp from "@/components/LookYourselfUp";
import RapSheet from "@/components/RapSheet";
import { SAMPLE_RECORD } from "@/lib/sampleRecord";

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
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "CommitCrimes",
      url: SITE,
      logo: `${SITE}/icon.svg`,
      sameAs: [
        "https://x.com/gitmostwanted",
        "https://github.com/zvoque/commitcrimes",
      ],
      founder: { "@id": `${SITE}/#creator` },
    },
    {
      "@type": "Person",
      "@id": `${SITE}/#creator`,
      name: "zvoque",
      url: "https://x.com/zvoque",
      sameAs: ["https://x.com/zvoque", "https://github.com/zvoque"],
    },
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
      publisher: { "@id": `${SITE}/#org` },
      creator: { "@id": `${SITE}/#creator` },
    },
  ],
};

export default function Home() {
  return (
    <main className="paper-bg relative flex flex-1 flex-col overflow-hidden px-5 pb-10 pt-20 sm:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grain-overlay" />

      <BrandMark className="absolute left-5 top-5 z-20" />

      {/* faint oversized watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-1/2 z-0 -translate-y-1/2 select-none font-stencil text-[24vw] leading-none text-ink/[0.06] -rotate-6 lg:top-[42%]"
      >
        GUILTY
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-start gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-6">
        {/* Left: pitch + primary action */}
        <div className="order-1 w-full text-center lg:text-left">
          <div className="mb-4 inline-flex items-center border border-ink/50 px-3 py-1 text-[0.72rem] uppercase tracking-[0.36em] text-ink-soft">
            Department of Version Control
          </div>

          <h1 className="font-stencil text-6xl leading-[0.85] text-ink sm:text-7xl">
            Commit
            <br />
            Crimes
          </h1>

          <p className="mt-5 mx-auto max-w-md text-xl leading-snug text-ink sm:text-2xl lg:mx-0">
            Paste any GitHub handle. Pull their permanent record.
          </p>
          <p className="mt-2 mx-auto max-w-md text-base text-ink-soft lg:mx-0">
            Every push leaves evidence. We book them for crimes against version
            control and hand down the sentence.
          </p>

          <div className="mt-7 flex justify-center lg:block">
            <SuspectSearch />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm lg:justify-start">
            <Link
              href="/wanted"
              className="font-stencil uppercase tracking-[0.14em] text-ink underline decoration-2 underline-offset-4 hover:text-stamp"
            >
              See the Most Wanted &rarr;
            </Link>
            <LookYourselfUp />
            <Link
              href="/deep"
              className="text-ink-soft underline decoration-dotted underline-offset-4 hover:text-stamp"
            >
              Repos private? Get your Deep Record &rarr;
            </Link>
          </div>

          <p className="mt-5 mx-auto max-w-md text-xs text-ink-soft/65 lg:mx-0">
            Public data only. We read commit metadata, never your code.
          </p>

          {/* Badge teaser — keepable artifact + the on-profile loop. */}
          <div className="mt-8 mx-auto max-w-md border-t border-ink/20 pt-5 lg:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/badge/zvoque.svg"
              alt="Example CommitCrimes README badge"
              className="mx-auto h-7 lg:mx-0"
            />
            <p className="mt-2 text-sm text-ink-soft">
              Claim your record to earn a{" "}
              <span className="text-ink">README badge</span> for your GitHub
              profile. It re-books you as you rack up new crimes.
            </p>
          </div>
        </div>

        {/* Right: the payoff, made undeniable before anyone types */}
        <div className="order-2 w-full">
          <div className="relative mx-auto w-full max-w-md lg:max-w-[600px]">
            <span
              aria-hidden
              className="absolute -left-2 -top-3 z-20 -rotate-[7deg] border-2 border-stamp bg-paper px-2 py-0.5 font-stencil text-xs uppercase tracking-[0.2em] text-stamp shadow-[2px_2px_0_0_rgba(20,16,10,0.4)]"
            >
              Exhibit A
            </span>
            <div inert>
              <RapSheet record={SAMPLE_RECORD} />
            </div>
            <p className="mt-4 text-center text-[0.78rem] uppercase tracking-[0.22em] text-ink-soft">
              Pulled from public commits. Run anyone in seconds.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
