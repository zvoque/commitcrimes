"use client";

import { useState } from "react";

export default function RemoveButton() {
  const [state, setState] = useState<"idle" | "confirm" | "working" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function go() {
    setState("working");
    try {
      const res = await fetch("/api/remove", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; login?: string };
      if (res.ok) {
        setState("done");
      } else {
        setState("error");
        setMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMsg("Network error.");
    }
  }

  if (state === "done") {
    return (
      <p className="border border-[#3f6f3f] bg-[#3f6f3f]/10 px-4 py-3 text-sm text-[#3f6f3f]">
        Record sealed. Your account is removed and blocked from future booking.
      </p>
    );
  }

  if (state === "confirm") {
    return (
      <div>
        <p className="mb-3 border-l-4 border-stamp pl-3 text-sm text-ink">
          This permanently erases your record and blocks your handle from being
          booked again. You can undo it, but only by signing in and re-booking
          yourself. Sure?
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={go}
            className="border-2 border-stamp bg-stamp px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:opacity-90"
          >
            Yes, remove me
          </button>
          <button
            onClick={() => setState("idle")}
            className="border-2 border-ink/50 px-5 py-2 text-sm uppercase tracking-[0.16em] text-ink-soft font-stencil hover:border-ink hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setState("confirm")}
        disabled={state === "working"}
        className="border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil hover:bg-stamp disabled:opacity-60"
      >
        {state === "working" ? "Sealing…" : "Remove my record"}
      </button>
      {state === "error" && <p className="mt-2 text-sm text-stamp">{msg}</p>}
    </div>
  );
}
