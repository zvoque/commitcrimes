"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { track } from "@/lib/analytics";
import { USERNAME_RE } from "@/lib/username";

const SUSPECTS = ["zvoque", "torvalds", "gaearon", "sindresorhus", "tj", "antirez"];

export default function SuspectSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function book(raw: string) {
    const u = raw.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
    if (!USERNAME_RE.test(u)) {
      setError("Not a valid GitHub handle.");
      return;
    }
    setError("");
    track("run_record", { source: raw === u ? "typed" : "suggested" });
    startTransition(() => router.push(`/u/${u}`));
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          book(value);
        }}
        className="relative border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] shadow-[6px_6px_0_0_var(--ink)]"
      >
        <label className="block px-4 pt-3 text-[0.72rem] tracking-[0.34em] uppercase text-ink-soft">
          Dept. of Version Control · Booking Intake
        </label>
        <div className="flex items-center gap-2 px-3 pb-4 pt-3">
          <span className="pl-1 text-xl sm:text-3xl text-ink-soft select-none">@</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            placeholder="github-handle"
            spellCheck={false}
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent py-1 text-xl sm:text-3xl outline-none placeholder:text-ink-soft/45 text-ink"
          />
          <button
            type="submit"
            disabled={pending}
            className="self-stretch shrink-0 bg-ink px-3 sm:px-6 text-paper text-xs sm:text-sm tracking-[0.16em] sm:tracking-[0.18em] uppercase font-stencil hover:bg-stamp transition-colors disabled:opacity-60"
          >
            {pending ? "Booking…" : "Run record"}
          </button>
        </div>
        {error && <div className="px-4 pb-2 text-xs text-stamp">{error}</div>}
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[0.72rem] tracking-[0.3em] uppercase text-ink-soft mr-1">
          Recently booked:
        </span>
        {SUSPECTS.map((s) => (
          <button
            key={s}
            onClick={() => book(s)}
            disabled={pending}
            className="border border-ink/60 px-2 py-0.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
