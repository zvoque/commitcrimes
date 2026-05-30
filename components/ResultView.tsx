"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import type { CrimeRecord } from "@/lib/types";
import { track } from "@/lib/analytics";
import { clerkClientEnabled } from "@/lib/config";
import RapSheet from "./RapSheet";
import SuspectSearch from "./SuspectSearch";

const SITE = "https://commitcrimes.dev";

// Handles used for "go book someone else" prompts. Recognizable, always have a
// juicy record, keep the loop spinning.
const RIVALS = ["torvalds", "gaearon", "sindresorhus", "tj"];

const BTN_PRIMARY =
  "border-2 border-ink bg-ink px-5 py-2.5 text-sm uppercase tracking-[0.16em] text-paper font-stencil shadow-[4px_4px_0_0_rgba(20,16,10,0.5)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-60";
const BTN_SECONDARY =
  "border-2 border-ink px-5 py-2.5 text-sm uppercase tracking-[0.16em] text-ink font-stencil transition-colors hover:bg-ink hover:text-paper";
const BTN_TERTIARY =
  "self-center px-1 py-2 text-sm uppercase tracking-[0.14em] text-ink-soft underline decoration-dotted underline-offset-4 hover:text-stamp";

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
  const [imgCopied, setImgCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // Browser export capabilities, detected post-mount:
  //  share = mobile share sheet (post + save-to-camera-roll in one tap)
  //  copy  = desktop clipboard-image (lowest-friction laptop share)
  const [caps, setCaps] = useState({ share: false, copy: false });
  const canShareImage = caps.share;
  const canCopyImage = caps.copy;
  // The rap-sheet image is PREFETCHED into a Blob so share/copy can fire
  // synchronously inside the click. Awaiting a fetch first consumes the
  // user-activation and makes the first tap silently fail.
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);

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
  const badgePreviewUrl = `/badge/${record.login}.svg`;
  const recordUrl = `${SITE}/u/${record.login}`;
  const snippet = `[![CommitCrimes](${badgeUrl})](${recordUrl})`;
  const shareText = sentenceShareText(record);
  const tweet = `${shareText}\n\n${recordUrl}\n\nvia @gitmostwanted`;
  const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  // Server-rendered full rap sheet (fixed width, real fonts, all charges, mugshot).
  const sheetImg = `/api/sheet?u=${encodeURIComponent(record.login)}`;
  const fileName = `commitcrimes-${record.login}.png`;

  // Probe share/copy support, then prefetch the image so the button is armed.
  useEffect(() => {
    let supportedShare = false;
    try {
      const probe = new File([new Uint8Array(1)], "p.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      // Desktop Chrome reports canShare({files})===true but its file-share is
      // unreliable, so the share sheet is touch-only. Desktop gets clipboard copy.
      const touch =
        typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
      supportedShare = touch && !!nav.canShare?.({ files: [probe] }) && !!navigator.share;
    } catch {
      supportedShare = false;
    }
    let supportedCopy = false;
    try {
      supportedCopy =
        typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
    } catch {
      supportedCopy = false;
    }
    // Capability sync from the browser into React; one write, intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaps({ share: supportedShare, copy: supportedCopy });

    if (!supportedShare && !supportedCopy) return; // download path needs no blob
    let alive = true;
    (async () => {
      try {
        const blob = await (await fetch(sheetImg)).blob();
        if (alive) setShareBlob(blob);
      } catch {
        /* leave null -> buttons fall back to download */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sheetImg]);

  // Fired inside the click gesture; shareBlob already loaded.
  function shareImage() {
    if (!shareBlob) return;
    track("shared", { surface: "mobile", deep });
    const file = new File([shareBlob], fileName, { type: "image/png" });
    navigator.share({ files: [file], text: tweet }).catch(() => {
      /* user dismissed the sheet */
    });
  }

  async function copyImage() {
    if (!shareBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": shareBlob }),
      ]);
      track("copied_image", { deep });
      setImgCopied(true);
      setTimeout(() => setImgCopied(false), 1800);
    } catch {
      // Clipboard image write blocked — fall back to opening the PNG.
      track("downloaded", { deep, via: "copy_fallback" });
      window.open(sheetImg, "_blank", "noopener,noreferrer");
    }
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

  const rivalNudge = (
    <Link
      href="/"
      onClick={() => track("run_another", { from: "report" })}
      className="mt-4 flex flex-col items-start gap-1 border-2 border-dashed border-ink/50 px-4 py-3 transition-colors hover:border-ink hover:bg-ink/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <span className="text-sm text-ink-soft">Caught someone in the act?</span>
      <span className="font-stencil text-sm uppercase tracking-[0.14em] text-ink">
        Run your tech lead &rarr;
      </span>
    </Link>
  );

  return (
    <div className="w-full max-w-[720px]">
      <div className="rise-in">
        <RapSheet record={record} />
      </div>

      {/* SHARE / EXPORT — the growth loop, made loud. */}
      <div className="mt-5">
        <p className="mb-2 text-[0.72rem] uppercase tracking-[0.28em] text-ink-soft">
          {thin ? "Share the verdict" : "Spread the conviction"}
        </p>
        <div className="flex flex-wrap gap-3">
          {canShareImage ? (
            <button onClick={shareImage} disabled={!shareBlob} className={BTN_PRIMARY}>
              {shareBlob ? "Share / save mugshot" : "Preparing…"}
            </button>
          ) : (
            <>
              {canCopyImage && (
                <button
                  onClick={copyImage}
                  disabled={!shareBlob}
                  className={BTN_PRIMARY}
                >
                  {imgCopied
                    ? "Copied ✓"
                    : shareBlob
                      ? "Copy mugshot"
                      : "Preparing…"}
                </button>
              )}
              <a
                href={tweetIntent}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("shared", { surface: "tweet", deep })}
                className={canCopyImage ? BTN_SECONDARY : BTN_PRIMARY}
              >
                Post the conviction
              </a>
              <a
                href={sheetImg}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("downloaded", { deep })}
                className={BTN_TERTIARY}
              >
                Download
              </a>
            </>
          )}
        </div>
        {canCopyImage && !canShareImage && (
          <p className="mt-2 text-xs text-ink-soft/70">
            Copies the full sheet as an image. Paste straight into X, Slack, or
            Discord.
          </p>
        )}
      </div>

      {isOwner ? (
        <>
          {/* Owner's highest-value action first: the README badge is the
              compounding loop (it lands on their profile, other devs see it). */}
          {thin && !deep ? (
            <Panel>
              <p className="text-sm text-ink-soft">
                No public activity to charge yet.{" "}
                <Link href="/deep" className="text-ink underline hover:text-stamp">
                  Add your Deep Record &rarr;
                </Link>
              </p>
            </Panel>
          ) : claimed ? (
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
                  <Link href="/wanted" className="underline hover:text-stamp">
                    Most Wanted
                  </Link>{" "}
                  board.
                  {!deep && (
                    <>
                      {" "}
                      Private repos still at large.{" "}
                      <Link href="/deep" className="underline hover:text-stamp">
                        See your full record &rarr;
                      </Link>
                    </>
                  )}
                </p>
              </Panel>
            </>
          ) : (
            <section className="mt-6 border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-4">
              <h3 className="font-stencil text-xl uppercase">Claim your record</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Lock in this badge for your GitHub README and take your spot on the
                Most Wanted board. Every profile visitor sees your sentence.
              </p>
              <div className="mt-3 flex items-center gap-3 border border-dashed border-ink/50 bg-paper px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgePreviewUrl} alt="Your CommitCrimes badge" className="h-7" />
                <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                  ← claim to unlock
                </span>
              </div>
              <button
                onClick={claim}
                disabled={claiming}
                className="mt-3 border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp disabled:opacity-60"
              >
                {claiming ? "Claiming…" : "Claim + unlock badge"}
              </button>
              {!deep && (
                <p className="mt-3 text-sm text-ink-soft">
                  Repos private?{" "}
                  <Link href="/deep" className="text-ink underline hover:text-stamp">
                    Get your full record &rarr;
                  </Link>
                </p>
              )}
            </section>
          )}

          {rivalNudge}
        </>
      ) : (
        <>
          {/* Non-owner: a single "your turn" block covers both running yourself
              and running someone else, so we drop the separate rival nudge here
              (it stays for owners, whose only book-another path it is). */}
          {claimed && (
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
                <Link href="/wanted" className="underline hover:text-stamp">
                  Most Wanted
                </Link>{" "}
                board.
              </span>
            </div>
          )}

          {thin && !deep ? (
            <Panel>
              <p className="text-sm text-ink-soft">
                No public activity to charge. If these repos are yours and private,{" "}
                <Link href="/deep" className="text-ink underline hover:text-stamp">
                  sign in for your Deep Record &rarr;
                </Link>
              </p>
              <RivalChips />
            </Panel>
          ) : (
            <section className="mt-6 border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-4">
              <h3 className="font-stencil text-xl uppercase">Your turn</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Run your own, or someone who deserves it.
              </p>
              <div className="mt-3">
                <SuspectSearch compact />
              </div>
              {clerkClientEnabled && <ClaimSignInPrompt login={record.login} />}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// Sign-in-to-claim prompt, shown only to logged-OUT visitors. Isolated into its
// own component so useUser() runs only when Clerk is enabled (the parent renders
// this conditionally), never without a ClerkProvider.
function ClaimSignInPrompt({ login }: { login: string }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || isSignedIn) return null;
  return (
    <p className="mt-3 text-xs text-ink-soft/80">
      Already booked?{" "}
      <SignInButton mode="modal" forceRedirectUrl={`/u/${login}`}>
        <button className="text-ink underline decoration-dotted underline-offset-4 hover:text-stamp">
          Sign in to claim your badge &rarr;
        </button>
      </SignInButton>
    </p>
  );
}

function RivalChips() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-[0.72rem] uppercase tracking-[0.28em] text-ink-soft">
        Try someone with priors:
      </span>
      {RIVALS.map((r) => (
        <Link
          key={r}
          href={`/u/${r}`}
          className="border border-ink/60 px-2.5 py-1 font-mono text-[0.9rem] text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {r}
        </Link>
      ))}
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
