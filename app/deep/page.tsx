import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { getDeepRecordForToken } from "@/lib/deep";
import { getGithubTokenInfo, getClerkGithubLogin } from "@/lib/clerkGithub";
import { getCrimeRecord } from "@/lib/github";
import { isClaimed } from "@/lib/store";
import type { CrimeRecord } from "@/lib/types";
import ResultView from "@/components/ResultView";
import GrantPrivateAccess from "@/components/GrantPrivateAccess";
import RankDeepButton from "@/components/RankDeepButton";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";
import { clerkClientEnabled as clerkEnabled } from "@/lib/config";

export const metadata: Metadata = {
  title: "Deep Record · CommitCrimes",
  robots: { index: false },
};

export default async function DeepPage() {
  let record: CrimeRecord | null = null;
  let publicRecord: CrimeRecord | null = null;
  let claimed = false;
  let state: "unconfigured" | "signin" | "needs-github" | "needs-repo" | "failed" | "ok" =
    "signin";

  if (!clerkEnabled) {
    state = "unconfigured";
  } else {
    const { userId } = await auth();
    if (!userId) {
      state = "signin";
    } else {
      try {
        const info = await getGithubTokenInfo(userId);
        if (!info) {
          state = "needs-github";
        } else if (!info.scopes.includes("repo")) {
          // Base read:user grant only — step up to `repo` for private repos.
          state = "needs-repo";
          const login = await getClerkGithubLogin();
          if (login) {
            [publicRecord, claimed] = await Promise.all([
              getCrimeRecord(login, undefined, { publicOnly: true }).catch(() => null),
              isClaimed(login),
            ]);
          }
        } else {
          record = await getDeepRecordForToken(info.token);
          state = record ? "ok" : "failed";
          if (record) {
            // Upsell punch: how much worse is the full sentence vs public-only.
            [publicRecord, claimed] = await Promise.all([
              getCrimeRecord(record.login, undefined, { publicOnly: true }).catch(() => null),
              isClaimed(record.login),
            ]);
          }
        }
      } catch {
        state = "failed";
      }
    }
  }

  const delta =
    publicRecord && record && publicRecord.sentence.totalYears !== record.sentence.totalYears;

  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      <div className="grain-overlay" />

      <BrandMark className="relative z-10 mb-8 self-start" />

      <div className="relative z-10 flex w-full justify-center">
        {state === "ok" && record ? (
          <div className="w-full max-w-[720px]">
            {delta && publicRecord && (
              <p className="mb-4 text-center text-sm text-ink-soft">
                Public record:{" "}
                <span className="text-ink">{publicRecord.sentence.text}</span>. With
                private repos:{" "}
                <span className="font-stencil text-stamp">{record.sentence.text}</span>.
              </p>
            )}
            <ResultView record={record} isOwner claimed={claimed} />
            <RankDeepButton />
            <p className="mt-4 text-center text-[0.76rem] tracking-[0.2em] uppercase text-ink-soft">
              <SignOutButton redirectUrl="/deep">
                <button className="underline hover:text-stamp">Sign out</button>
              </SignOutButton>
            </p>
          </div>
        ) : state === "needs-repo" ? (
          <div className="w-full max-w-[720px]">
            <div className="border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 text-center shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
              <p className="font-stencil text-3xl text-ink">Almost There</p>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Your private repos are still at large. Grant access to include them
                in the full sentence. We read commit metadata only, never your code.
              </p>
              <div className="mt-5 flex justify-center">
                <GrantPrivateAccess />
              </div>
              <p className="mt-3 text-[0.76rem] tracking-[0.2em] uppercase text-ink-soft">
                <SignOutButton redirectUrl="/deep">
                  <button className="underline hover:text-stamp">Sign out</button>
                </SignOutButton>
              </p>
            </div>
            {publicRecord && (
              <div className="mt-8">
                <p className="mb-3 text-center text-[0.76rem] uppercase tracking-[0.2em] text-ink-soft">
                  Your public record so far
                </p>
                <ResultView record={publicRecord} isOwner claimed={claimed} />
              </div>
            )}
          </div>
        ) : (
          <Intro state={state} />
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Intro({
  state,
}: {
  state: "unconfigured" | "signin" | "needs-github" | "failed" | "ok";
}) {
  const problem =
    state === "unconfigured"
      ? "Deep Record isn't configured on this deployment yet."
      : state === "failed"
        ? "Couldn't pull your record. Try signing in again."
        : state === "needs-github"
          ? "No GitHub access found. Sign in with GitHub to continue."
          : null;

  return (
    <div className="w-full max-w-md border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 text-center shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
      <p className="font-stencil text-4xl leading-none text-ink">The Deep Record</p>
      <p className="mt-4 text-ink-soft">
        Repos all private? Sign in with GitHub and get yours, booked on the full
        evidence, private repos included.
      </p>

      <ul className="mt-5 space-y-1.5 text-left text-sm text-ink-soft">
        <li>· We read commit metadata only. We never see your code.</li>
        <li>· Charges show as counts. No repo names, no commit text.</li>
        <li>· Your deep record stays private unless you share it.</li>
      </ul>

      {problem && (
        <p className="mt-5 border border-stamp/60 bg-stamp/10 px-3 py-2 text-sm text-stamp">
          {problem}
        </p>
      )}

      {clerkEnabled ? (
        <div className="mt-6">
          <SignInButton mode="modal" forceRedirectUrl="/deep">
            <button className="border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp">
              Sign in with GitHub
            </button>
          </SignInButton>
        </div>
      ) : (
        <Link
          href="/"
          className="mt-6 inline-block border-2 border-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-ink font-stencil hover:bg-ink hover:text-paper"
        >
          Back to booking
        </Link>
      )}
    </div>
  );
}
