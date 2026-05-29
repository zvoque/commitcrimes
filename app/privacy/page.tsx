import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "Privacy · CommitCrimes",
  description: "What data CommitCrimes uses, why, and how to remove it.",
  alternates: { canonical: "/privacy" },
};

const CONTACT = "privacy@commitcrimes.dev"; // TODO: set a real inbox before launch

export default function PrivacyPage() {
  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      <div className="grain-overlay" />

      <BrandMark className="relative z-10 mb-8 self-start" />

      <article className="relative z-10 w-full max-w-2xl border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
        <h1 className="font-stencil text-4xl leading-none text-ink">Privacy</h1>
        <p className="mt-2 text-[0.76rem] uppercase tracking-[0.2em] text-ink-soft">
          Plain English. No dark patterns.
        </p>

        <div className="mt-5 space-y-5 text-ink-soft">
          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">What we use</h2>
            <p>
              Public GitHub data only: your handle, display name, avatar URL, public
              repositories (names, descriptions, languages, timestamps), and public
              commit metadata (messages and times). We do <strong>not</strong> read or
              store source code, and we don&apos;t process facial data from avatars.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">Deep Record (optional)</h2>
            <p>
              If you sign in with GitHub for a Deep Record, we use your access token in
              the moment to read your own repository metadata (including private repos
              you authorize) and immediately discard the token. <strong>By default your
              Deep Record is never written to our database.</strong> If you explicitly
              opt in to rank on Most Wanted, we store only your sentence, charge titles,
              and counts. Never repo names, never commit text. Remove it anytime on the{" "}
              <Link href="/remove" className="text-ink underline hover:text-stamp">Remove my record</Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">What we store</h2>
            <p>
              For public lookups we cache a computed record (handle, name, avatar URL,
              total sentence, charge titles/counts, last-updated time) in our database
              to keep pages and badges fast and current. That&apos;s it. We do not sell,
              rent, or share this data.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">Why</h2>
            <p>
              Satire and commentary built on already-public information (our legitimate
              interest). No marketing, no profiling for ads.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">Your rights</h2>
            <p>
              Access and erasure. Remove your record and block future
              booking on the{" "}
              <Link href="/remove" className="text-ink underline hover:text-stamp">Remove my record</Link>{" "}
              page, or email{" "}
              <a href={`mailto:${CONTACT}`} className="text-ink underline hover:text-stamp">{CONTACT}</a>.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">Analytics</h2>
            <p>
              We use PostHog for privacy-conscious, cookieless analytics: anonymous
              page views and a handful of action counts (a record was run, claimed,
              shared). No autocapture, no cross-site tracking, no personal profiles.
              We also use it to catch errors so we can fix them.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">Cookies</h2>
            <p>
              None for the public app, and our analytics are cookieless. If you
              choose to sign in (Deep Record / removal), our auth provider Clerk
              sets a session cookie to keep you signed in.
            </p>
          </section>

          <section>
            <h2 className="font-stencil text-lg uppercase text-ink">Not GitHub</h2>
            <p>
              CommitCrimes is an independent parody project, not affiliated with or
              endorsed by GitHub, Inc.
            </p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
