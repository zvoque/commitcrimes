import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-16 w-full max-w-2xl border-t border-ink/30 px-4 pb-10 pt-5 text-center">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[0.72rem] uppercase tracking-[0.2em] text-ink-soft">
        <Link href="/" className="hover:text-stamp">Book</Link>
        <Link href="/wanted" className="hover:text-stamp">Most Wanted</Link>
        <Link href="/about" className="hover:text-stamp">About</Link>
        <Link href="/privacy" className="hover:text-stamp">Privacy</Link>
        <Link href="/remove" className="hover:text-stamp">Remove me</Link>
        <a
          href="https://x.com/gitmostwanted"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-stamp"
        >
          @gitmostwanted
        </a>
      </nav>
      <p className="mx-auto mt-4 max-w-xl text-[0.76rem] leading-relaxed text-ink-soft/80">
        CommitCrimes is satire. A parody of git habits, built from public GitHub
        activity. Not real charges or convictions. Not affiliated with or endorsed
        by GitHub, Inc.
      </p>
    </footer>
  );
}
