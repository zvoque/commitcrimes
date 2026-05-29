"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

// Opt in (default off) to make your full deep record — private repos included —
// publicly visible on your /u page (and, since it has charges, the Most Wanted
// board). Posts to /api/rank-deep, which stores a sanitized record
// (sentence + charge titles + counts only).
export default function RankDeepButton() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rank-deep", { method: "POST" });
      if (res.ok) {
        track("deep_published");
        setDone(true);
      }
      else setError((await res.json().catch(() => ({})))?.error ?? "Could not publish.");
    } catch {
      setError("Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="mt-6 border-2 border-[#3f6f3f] bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-4 text-[#3f6f3f]">
        <p className="text-sm">
          ✓ Your full record is public now. Anyone visiting your record sees the
          complete sentence, and you&apos;re on the{" "}
          <Link href="/wanted" className="underline hover:text-stamp">Most Wanted</Link>{" "}
          board. Only your sentence, charge titles, and counts are shared. Never
          repo names, never commit text. Make it private again anytime at{" "}
          <Link href="/remove" className="underline hover:text-stamp">/remove</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-4">
      <h3 className="font-stencil text-xl uppercase">Let others see your full record</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Optional. Make your full sentence (private repos counted) public on your
        record, and land on the Most Wanted board. We share only your sentence,
        charge titles, and counts. Never repo names, never commit text. Private
        until you click.
      </p>
      <button
        onClick={publish}
        disabled={busy}
        className="mt-3 border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp disabled:opacity-60"
      >
        {busy ? "Publishing…" : "Make my full record public"}
      </button>
      {error && <p className="mt-3 text-sm text-stamp">{error}</p>}
    </section>
  );
}
