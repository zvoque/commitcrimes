import Link from "next/link";

// Logo lockup: cuffs mark + wordmark, links home. Used top-left across pages.
export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="CommitCrimes home"
      className={`group inline-flex items-center gap-2 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={30} height={30} className="shrink-0" />
      <span className="font-stencil text-xl tracking-[0.08em] leading-none text-ink transition-colors group-hover:text-stamp">
        COMMITCRIMES
      </span>
    </Link>
  );
}
