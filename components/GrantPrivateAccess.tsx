"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

// Step-up: ask GitHub for `repo` scope on top of the base `read:user` grant,
// only when the user opts into the Deep Record. Clerk's reauthorize returns a
// GitHub consent URL; we send the user there, and they land back on /deep with
// the elevated token.
export default function GrantPrivateAccess() {
  const { user, isLoaded } = useUser();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function grant() {
    setBusy(true);
    setErr("");
    try {
      const gh = user?.externalAccounts.find((a) => /github/i.test(a.provider));
      if (!gh) {
        setErr("No GitHub account linked.");
        return;
      }
      const reauthorized = await gh.reauthorize({
        additionalScopes: ["repo", "read:user"],
        redirectUrl: `${window.location.origin}/deep`,
      });
      const url = reauthorized.verification?.externalVerificationRedirectURL;
      if (url) {
        window.location.href = url.toString();
      } else {
        setErr("Could not start the GitHub grant. Try again.");
      }
    } catch {
      setErr("Could not start the GitHub grant. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={grant}
        disabled={!isLoaded || busy}
        className="border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp disabled:opacity-60"
      >
        {busy ? "Redirecting…" : "Grant private-repo access →"}
      </button>
      {err && <p className="mt-2 text-sm text-stamp">{err}</p>}
    </div>
  );
}
