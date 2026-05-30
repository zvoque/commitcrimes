import type { CrimeRecord } from "@/lib/types";

function Barcode() {
  // Deterministic-looking barcode from fixed widths.
  const bars = "13212312113132212311321312213".split("").map(Number);
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden>
      {bars.map((w, i) => (
        <span
          key={i}
          className="block bg-ink"
          style={{ width: `${w}px`, height: "100%" }}
        />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline text-[0.95rem]">
      <span className="shrink-0 text-[0.72rem] tracking-[0.22em] uppercase text-ink-soft">
        {label}
      </span>
      <span className="leader" />
      <span className="min-w-0 break-words text-right text-ink">{value}</span>
    </div>
  );
}

export default function RapSheet({ record }: { record: CrimeRecord }) {
  const { sentence, charges, stats } = record;
  const guilty = charges.length > 0;

  return (
    <article className="paper-bg relative mx-auto w-full max-w-[720px] overflow-hidden border-2 border-ink text-ink shadow-[8px_8px_0_0_rgba(20,16,10,0.55)]">
      <div className="grain-overlay" />

      {/* Top band */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 py-2 text-paper sm:justify-between">
        <span className="text-[0.68rem] tracking-[0.28em] uppercase opacity-80">
          Dept. of Version Control
        </span>
        <span className="font-stencil text-sm tracking-[0.25em] uppercase">
          Permanent Record
        </span>
        <span className="text-[0.72rem] tracking-[0.12em] tabular-nums opacity-90">
          {record.bookingNumber}
        </span>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-5 p-5 sm:grid-cols-[210px_1fr]">
        {/* Mugshot */}
        <div>
          <div className="relative border-2 border-ink bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_23px,rgba(33,27,18,0.18)_23px,rgba(33,27,18,0.18)_24px)]">
            {/* height ruler */}
            <div className="absolute left-0 top-0 z-10 flex h-full flex-col justify-between py-1 pl-1 text-[0.66rem] text-ink-soft">
              {["8", "6", "4", "2", "0"].map((n) => (
                <span key={n}>{n}-</span>
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.avatarUrl}
              alt={record.login}
              className="mugshot aspect-square w-full object-cover"
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 border-2 border-t-0 border-ink bg-ink px-2 py-1 text-paper">
            <span className="shrink-0 text-[0.68rem] tracking-[0.18em] uppercase opacity-75">
              Inmate
            </span>
            <span className="min-w-0 truncate font-stencil text-sm">@{record.login}</span>
          </div>
          <p className="mt-1 text-center text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">
            HT: {stats.heightYears} yrs on record
          </p>
        </div>

        {/* Dossier */}
        <div className="flex flex-col">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-stencil text-3xl leading-none text-ink">
              {record.name}
            </h2>
            <span
              aria-hidden
              className="select-none border-[4px] px-3 py-0.5 font-stencil text-3xl uppercase leading-none tracking-wider"
              style={{
                color: guilty ? "var(--stamp)" : "#3f6f3f",
                borderColor: guilty ? "var(--stamp)" : "#3f6f3f",
              }}
            >
              {guilty ? "Guilty" : "Cleared"}
            </span>
          </div>
          {record.deep && (
            <span className="mb-2 inline-block w-fit border border-[#3f6f3f] px-1.5 py-0.5 text-[0.68rem] tracking-[0.2em] uppercase text-[#3f6f3f]">
              ✓ Deep Record
            </span>
          )}
          <div className="flex flex-col gap-2">
            <Row label="A.K.A." value={stats.aliases.join(", ")} />
            <Row label="M.O." value={stats.modusOperandi.join(", ")} />
            <Row label="Member Since" value={String(stats.memberSince)} />
            <Row label="Known Associates" value={`${stats.knownAssociates} followers`} />
            <Row label="Prior Convictions" value={`${stats.priorConvictions} repos`} />
            <Row label="Status" value={guilty ? "CONVICTED" : "CLEARED"} />
          </div>
        </div>
      </div>

      {/* Sentence banner */}
      <div
        className={`relative z-10 mx-5 mb-1 border-y-4 ${
          guilty ? "border-stamp" : "border-ink"
        } py-2 text-center`}
      >
        <p className="text-[0.7rem] tracking-[0.34em] uppercase text-ink-soft">
          Sentence
        </p>
        <p
          className={`font-stencil text-2xl sm:text-3xl uppercase leading-tight ${
            guilty ? "text-stamp" : "text-ink"
          }`}
        >
          {sentence.text}
        </p>
      </div>

      {/* Charges */}
      <div className="relative z-10 px-5 pb-3 pt-2">
        <p className="mb-2 text-[0.72rem] tracking-[0.3em] uppercase text-ink-soft">
          {guilty ? `Charges filed · ${charges.length} count(s)` : "No charges"}
        </p>

        {guilty ? (
          <ul className="flex flex-col">
            {charges.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-0.5 border-t border-dashed border-ink/40 py-2 first:border-t-0"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="shrink-0 bg-ink px-1.5 py-0.5 text-[0.7rem] tabular-nums text-paper">
                    {c.statute.replace(/\./g, "-")}
                  </span>
                  <span className="min-w-0 break-words font-stencil text-base uppercase leading-tight">
                    {c.title}
                  </span>
                  <span className="leader" />
                  <span className="shrink-0 font-stencil text-base text-stamp">
                    {c.years}y
                  </span>
                </div>
                <p className="pl-1 text-[0.82rem] italic text-ink-soft">{c.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-center text-sm italic text-ink-soft">
            Suspiciously clean. The Department is watching.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-end justify-between gap-3 border-t-2 border-ink px-5 py-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] tracking-[0.2em] uppercase text-ink-soft">
            The State of GitHub v.
          </p>
          <a
            href={`https://github.com/${record.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="my-0.5 block truncate font-stencil text-lg leading-tight hover:text-stamp"
          >
            @{record.login}
          </a>
          <p className="text-[0.68rem] tracking-[0.2em] uppercase text-ink-soft/80">
            commitcrimes.dev
          </p>
        </div>
        <div className="shrink-0">
          <Barcode />
        </div>
      </div>

      {/* Absurd in-character boilerplate (vibe) */}
      <div className="relative z-10 border-t border-ink/25 px-5 py-1.5 text-center text-[0.66rem] tracking-[0.16em] uppercase text-ink-soft/80">
        Filed in the District Court of Diff · Hon. Judge git-blame presiding · no real statutes were consulted
      </div>

      {/* Tiny legal fine print (cover) — on-theme for a mock form. Deep records
          include private repos, so the source line changes accordingly. */}
      <div className="relative z-10 bg-[rgba(20,16,10,0.05)] px-5 py-1 text-center text-[0.64rem] leading-snug text-ink-soft/70">
        {record.deep
          ? "Not real charges or convictions. Built from your own GitHub data, public and private, with your consent. Not affiliated with GitHub, Inc. Remove yours at commitcrimes.dev/remove"
          : "Not real charges or convictions. Built from public GitHub data. Not affiliated with GitHub, Inc. Remove yours at commitcrimes.dev/remove"}
      </div>
    </article>
  );
}
