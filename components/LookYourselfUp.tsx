"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { clerkClientEnabled as enabled } from "@/lib/config";

const cls =
  "text-ink-soft underline decoration-dotted underline-offset-4 hover:text-stamp";

// Signed-in users skip typing: sign in -> /me redirects to their own record.
export default function LookYourselfUp() {
  if (enabled) {
    return (
      <SignInButton mode="modal" forceRedirectUrl="/me">
        <button className={cls}>Already booked? Sign in &rarr;</button>
      </SignInButton>
    );
  }
  return (
    <Link href="/deep" className={cls}>
      Already booked? Sign in &rarr;
    </Link>
  );
}
