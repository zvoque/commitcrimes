import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import RemoveButton from "@/components/RemoveButton";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";
import { clerkClientEnabled as clerkEnabled } from "@/lib/config";

export const metadata: Metadata = {
  title: "Remove my record · CommitCrimes",
  robots: { index: false },
};

const CONTACT = "privacy@commitcrimes.dev"; // TODO: set a real inbox before launch

export default async function RemovePage() {
  const signedIn = clerkEnabled ? !!(await auth()).userId : false;

  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      <div className="grain-overlay" />

      <BrandMark className="relative z-10 mb-8 self-start" />

      <div className="relative z-10 w-full max-w-md border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
        <h1 className="font-stencil text-4xl leading-none text-ink">Remove My Record</h1>
        <p className="mt-4 text-ink-soft">
          CommitCrimes uses only public GitHub data. You can have your record
          erased and blocked from future booking at any time.
        </p>

        <div className="mt-6">
          {clerkEnabled ? (
            signedIn ? (
              <RemoveButton />
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/remove">
                <button className="border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp">
                  Sign in with GitHub to remove your record
                </button>
              </SignInButton>
            )
          ) : (
            <p className="border border-ink/40 bg-paper px-4 py-3 text-sm text-ink-soft">
              Self-serve removal isn&apos;t enabled on this deployment yet.
            </p>
          )}
        </div>

        <p className="mt-6 border-t border-ink/20 pt-4 text-sm text-ink-soft">
          Prefer not to sign in, or want a record other than your own removed?
          Email{" "}
          <a href={`mailto:${CONTACT}`} className="text-ink underline hover:text-stamp">
            {CONTACT}
          </a>{" "}
          with the handle and we&apos;ll seal it.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
