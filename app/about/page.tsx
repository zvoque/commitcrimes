import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "About · CommitCrimes",
  description: "CommitCrimes files charges for crimes against version control.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      <div className="grain-overlay" />

      <BrandMark className="relative z-10 mb-8 self-start" />

      <article className="relative z-10 w-full max-w-2xl border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
        <h1 className="font-stencil text-4xl leading-none text-ink">About</h1>

        <div className="mt-5 space-y-4 text-ink-soft">
          <p>
            CommitCrimes reads a GitHub account&apos;s public activity and files
            charges for crimes against version control: forty commits that say
            only &ldquo;fix,&rdquo; pushes to main at 3 AM, a repo left for dead.
            Then it hands down a sentence.
          </p>

          <p className="border-l-2 border-stamp pl-4 text-ink">
            None of it is real. There are no charges and no convictions. Only
            public git history, read uncharitably for a laugh. CommitCrimes is
            parody.
          </p>

          <h2 className="pt-2 font-stencil text-xl uppercase text-ink">How it works</h2>
          <p>
            We read your public profile and repo history, then apply a fixed set
            of rules. No source code is read or stored.
          </p>
          <p>
            Repos all private? Sign in with GitHub for a{" "}
            <Link href="/deep" className="text-ink underline hover:text-stamp">Deep Record</Link>
            . It reads your own data, with your consent, and never sees your
            code.
          </p>

          <h2 className="pt-2 font-stencil text-xl uppercase text-ink">Not GitHub</h2>
          <p>
            An independent parody project, not affiliated with or endorsed by
            GitHub, Inc.
          </p>

          <h2 className="pt-2 font-stencil text-xl uppercase text-ink">Remove your record</h2>
          <p>
            Take yourself off the books anytime on{" "}
            <Link href="/remove" className="text-ink underline hover:text-stamp">Remove my record</Link>
            . The{" "}
            <Link href="/privacy" className="text-ink underline hover:text-stamp">Privacy</Link>{" "}
            page covers what we keep.
          </p>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
