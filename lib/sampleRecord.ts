import type { CrimeRecord } from "@/lib/types";

// A fictional rap sheet used as the landing-page "this is what you get" exhibit.
// Deliberately NOT a real person: the handle doubles as a nudge to go book
// someone you know. Avatar is an inline silhouette so it needs no network.
const MUGSHOT_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
<rect width='200' height='200' fill='rgba(33,27,18,0.06)'/>
<g stroke='rgba(33,27,18,0.22)' stroke-width='2'>
<line x1='0' y1='150' x2='200' y2='150'/>
<line x1='0' y1='110' x2='200' y2='110'/>
<line x1='0' y1='70' x2='200' y2='70'/>
</g>
<g fill='rgba(33,27,18,0.34)'>
<circle cx='100' cy='74' r='34'/>
<path d='M40 184c0-36 27-60 60-60s60 24 60 60z'/>
</g>
<text x='100' y='110' text-anchor='middle' font-family='Courier New, monospace' font-size='15' letter-spacing='2' font-weight='700' fill='rgba(33,27,18,0.7)'>NO PHOTO</text>
<text x='100' y='128' text-anchor='middle' font-family='Courier New, monospace' font-size='15' letter-spacing='2' font-weight='700' fill='rgba(33,27,18,0.7)'>ON FILE</text>
</svg>`;

export const SAMPLE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(MUGSHOT_SVG)}`;

export const SAMPLE_RECORD: CrimeRecord = {
  login: "yourcoworker",
  name: "Your Coworker",
  avatarUrl: SAMPLE_AVATAR,
  bookingNumber: "VC-0000-DEMO",
  charges: [
    {
      id: "force-push",
      title: "Force Push to Main",
      statute: "VC.1.07",
      detail: "Rewrote history on `main` at 2:14 AM. No survivors.",
      years: 25,
    },
    {
      id: "commit-negligence",
      title: "Commit Message Negligence",
      statute: "VC.2.11",
      detail: "147 commits titled “fix”. Zero context entered into evidence.",
      years: 12,
    },
    {
      id: "branch-abandonment",
      title: "Branch Abandonment, 3rd Degree",
      statute: "VC.4.02",
      detail: "39 branches left for dead. `feature/temp-final-v2` still breathing.",
      years: 8,
    },
    {
      id: "weekend-push",
      title: "Weekend Push Conspiracy",
      statute: "VC.6.66",
      detail: "Pushed to prod on a Sunday. Twice.",
      years: 5,
    },
  ],
  sentence: {
    totalYears: 50,
    text: "50 Years, No Parole",
    lead: {
      id: "force-push",
      title: "Force Push to Main",
      statute: "VC.1.07",
      detail: "Rewrote history on `main` at 2:14 AM. No survivors.",
      years: 25,
    },
    otherCount: 3,
    headline: "Repeat offender. The Department recommends no leniency.",
  },
  stats: {
    aliases: ["@yourcoworker", "Your Coworker"],
    modusOperandi: ["TypeScript", "YAML", "Regret"],
    priorConvictions: 42,
    knownAssociates: 128,
    memberSince: 2017,
    heightYears: 9,
    topLanguage: "TypeScript",
  },
};
