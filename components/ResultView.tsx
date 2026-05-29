"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CrimeRecord } from "@/lib/types";
import { track } from "@/lib/analytics";
import RapSheet from "./RapSheet";

const SITE = "https://commitcrimes.dev";

export default function ResultView({
  record,
  isOwner = false,
  claimed = false,
}: {
  record: CrimeRecord;
  isOwner?: boolean;
  claimed?: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // Whether this browser can share an image file (mobile share sheets). When
  // false we render a plain tweet-intent link instead.
  const [canShareImage, setCanShareImage] = useState(false);
  // The rap-sheet image is PREFETCHED into a File so the share button can call
  // navigator.share() synchronously inside the click. Awaiting a fetch first
  // consumes the user-activation and makes the first tap silently fail (the
  // "needs two presses" bug).
  const [shareFile, setShareFile] = useState<File | null>(null);

  const deep = !!record.deep;
  const thin = record.charges.length === 0;

  useEffect(() => {
    track("record_viewed", {
      deep,
      charges: record.charges.length,
      total_years: record.sentence.totalYears,
      owner: isOwner,
      claimed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.login]);
  const badgeUrl = `${SITE}/badge/${record.login}.svg`;
  const badgePreviewUrl = `/badge/${record.login}.svg`; // relative: loads in dev + prod
  const recordUrl = `${SITE}/u/${record.login}`;
  const snippet = `[![CommitCrimes](${badgeUrl})](${recordUrl})`;
  const shareText = sentenceShareText(record);
  const tweet = `${shareText}\n\n${recordUrl}\n\nvia @gitmostwanted`;
  const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  // Server-rendered full rap sheet (fixed width, real fonts, all charges,
  // includes the mugshot). Identical on every device since it never depends on
  // the live DOM / viewport. Used for both share + download.
  const sheetImg = `/api/sheet?u=${encodeURIComponent(record.login)}`;
  const fileName = `commitcrimes-${record.login}.png`;

  // Probe file-share support, then prefetch the image so the button is armed.
  useEffect(() => {
    let alive = true;
    let supported = false;
    try {
      const probe = new File([new Uint8Array(1)], "p.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      // Desktop Chrome reports canShare({files})===true but its file-share is
      // unreliable/no-op, so only use the share button on touch devices. Desktop
      // gets the always-working tweet + download links instead.
      const touch =
        typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
      supported = touch && !!nav.canShare?.({ files: [probe] }) && !!navigator.share;
    } catch {
      supported = false;
    }
    if (!supported) return;
    setCanShareImage(true);
    (async () => {
      try {
        const blob = await (await fetch(sheetImg)).blob();
        if (alive) setShareFile(new File([blob], fileName, { type: "image/png" }));
      } catch {
        /* leave shareFile null -> button stays disabled */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sheetImg, fileName]);

  // Called inside the click gesture. shareFile is already loaded, so
  // navigator.share() fires synchronously — works on the first press.
  function shareImage() {
    if (!shareFile) return;
    track("shared", { surface: "mobile", deep });
    navigator
      .share({ files: [shareFile], text: tweet })
      .catch(() => {
        /* user dismissed the sheet — no-op */
      });
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function claim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/claim", { method: "POST" });
      if (res.ok) {
        track("record_claimed");
        router.refresh();
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="w-full max-w-[720px]">
      <div className="rise-in">
        <RapSheet record={record} />
      </div>

      {/* Action bar. On mobile the share sheet covers both saving to the camera
          roll ("Save Image") and posting, so one button. Desktop has no share
          sheet -> separate post + file-download. */}
      <div className="mt-5 flex flex-wrap gap-3">
        {canShareImage ? (
          <button
            onClick={shareImage}
            disabled={!shareFile}
            className="border-2 border-ink bg-ink px-4 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil shadow-[4px_4px_0_0_rgba(20,16,10,0.5)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60"
          >
            {shareFile ? "Share / save mugshot" : "Preparing…"}
          </button>
        ) : (
          <>
            <a
              href={tweetIntent}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("shared", { surface: "tweet", deep })}
              className="border-2 border-ink bg-ink px-4 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil shadow-[4px_4px_0_0_rgba(20,16,10,0.5)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              Post the conviction
            </a>
            <a
              href={sheetImg}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("downloaded", { deep })}
              className="border-2 border-ink px-4 py-2 text-sm uppercase tracking-[0.16em] text-ink font-stencil transition-colors hover:bg-ink hover:text-paper"
            >
              Download mugshot
            </a>
          </>
        )}
        <Link
          href="/"
          className="border-2 border-ink/50 px-4 py-2 text-sm uppercase tracking-[0.16em] text-ink-soft font-stencil transition-colors hover:border-ink hover:text-ink"
        >
          Book another
        </Link>
      </div>

      {/* Public "claimed" marker — any visitor on a claimed record sees it's
          owned/verified, but the badge snippet stays owner-only (below). */}
      {claimed && !isOwner && (
        <div className="mt-5 flex items-center gap-2 border-2 border-[#3f6f3f] bg-[color-mix(in_srgb,var(--paper)_92%,white)] px-4 py-2 text-sm text-[#3f6f3f]">
          <span aria-hidden>✓</span>
          <span>
            Claimed by{" "}
            <a
              href={`https://github.com/${record.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-stamp"
            >
              @{record.login}
            </a>
            . This record is on the{" "}
            <Link href="/wanted" className="underline hover:text-stamp">Most Wanted</Link>{" "}
            board.
          </span>
        </div>
      )}

      {/* Contextual funnel block */}
      {thin && !deep ? (
        <Panel>
          <p className="text-sm text-ink-soft">
            No public activity to charge. If these repos are yours and private,{" "}
            <Link href="/deep" className="text-ink underline hover:text-stamp">
              sign in for your Deep Record &rarr;
            </Link>
          </p>
        </Panel>
      ) : isOwner && claimed ? (
        <>
          <BadgePanel
            deep={deep}
            badgePreviewUrl={badgePreviewUrl}
            snippet={snippet}
            copied={copied}
            onCopy={copySnippet}
          />
          <Panel ok>
            <p className="text-sm">
              ✓ Claimed. You&apos;re on the{" "}
              <Link href="/wanted" className="underline hover:text-stamp">Most Wanted</Link>{" "}
              board.
              {!deep && (
                <>
                  {" "}Private repos still at large.{" "}
                  <Link href="/deep" className="underline hover:text-stamp">
                    See your full record &rarr;
                  </Link>
                </>
              )}
            </p>
          </Panel>
        </>
      ) : isOwner ? (
        <Panel>
          <h3 className="font-stencil text-xl uppercase">Claim your record</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Put yourself on the Most Wanted board and unlock your README badge.
          </p>
          <button
            onClick={claim}
            disabled={claiming}
            className="mt-3 border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp disabled:opacity-60"
          >
            {claiming ? "Claiming…" : "Claim your record"}
          </button>
          {!deep && (
            <p className="mt-3 text-sm text-ink-soft">
              Repos private?{" "}
              <Link href="/deep" className="text-ink underline hover:text-stamp">
                Get your full record &rarr;
              </Link>
            </p>
          )}
        </Panel>
      ) : (
        <Panel center>
          <p className="text-sm text-ink-soft">
            Want a badge and a spot on Most Wanted?{" "}
            <Link href="/" className="text-ink underline hover:text-stamp">
              Run your own record
            </Link>
            .
          </p>
        </Panel>
      )}
    </div>
  );
}

function Panel({
  children,
  center,
  ok,
}: {
  children: React.ReactNode;
  center?: boolean;
  ok?: boolean;
}) {
  return (
    <section
      className={`mt-6 border-2 p-4 bg-[color-mix(in_srgb,var(--paper)_92%,white)] ${
        ok ? "border-[#3f6f3f] text-[#3f6f3f]" : "border-ink/50"
      } ${center ? "text-center" : ""}`}
    >
      {children}
    </section>
  );
}

function BadgePanel({
  deep,
  badgePreviewUrl,
  snippet,
  copied,
  onCopy,
}: {
  deep: boolean;
  badgePreviewUrl: string;
  snippet: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="mt-6 border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-4">
      <h3 className="font-stencil text-xl uppercase">Wear your record</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Drop this in your GitHub profile README. Every visitor sees your sentence.
      </p>
      {deep && (
        <p className="mt-1 text-xs text-ink-soft/80">
          Note: the public badge reflects public data only. Your private record
          stays private. Download the mugshot above to share the full sentence.
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgePreviewUrl} alt="Your CommitCrimes badge" className="h-7" />
      </div>
      <div className="mt-3 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap border border-ink/50 bg-paper px-3 py-2 text-[0.8rem] text-ink">
          {snippet}
        </code>
        <button
          onClick={onCopy}
          className="shrink-0 border-2 border-ink bg-ink px-3 text-xs uppercase tracking-[0.14em] text-paper font-stencil"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}

function sentenceShareText(record: CrimeRecord): string {
  const lead = record.sentence.lead?.title;
  // Deep records are always the viewer's own account -> first person.
  if (record.deep) {
    if (record.charges.length === 0) {
      return `My GitHub came back CLEAN on CommitCrimes. No priors. 🧼`;
    }
    return `I was sentenced to ${record.sentence.text} for ${lead} on CommitCrimes. ⚖️`;
  }
  // Public records could be anyone -> third person.
  const subject = `@${record.login}`;
  if (record.charges.length === 0) {
    return `${subject} came back CLEAN on CommitCrimes. No priors. 🧼 Think you're cleaner?`;
  }
  return `${subject} was sentenced to ${record.sentence.text} for ${lead} on CommitCrimes. ⚖️`;
}
