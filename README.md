<div align="center">

<a href="https://commitcrimes.dev">
  <img src="https://commitcrimes.dev/opengraph-image" width="640" alt="CommitCrimes — your git habits, prosecuted" />
</a>

# CommitCrimes

**Your git habits, prosecuted.**

Paste any GitHub handle. We pull the public record, book them for crimes against
version control, and hand down a sentence.

[![Live](https://img.shields.io/badge/live-commitcrimes.dev-a3282a?style=flat-square)](https://commitcrimes.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-211b12?style=flat-square)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-on%20Cloudflare%20Workers-211b12?style=flat-square)](https://opennext.js.org/cloudflare)

<br />

My crimes:

[![CommitCrimes](https://commitcrimes.dev/badge/zvoque.svg)](https://commitcrimes.dev/u/zvoque)

</div>

---

## The rap sheet

Force-pushed to `main`. Forty commits that just say `fix`. A repo last touched in
2019. A commit at 3:47 AM that says `asdf`. CommitCrimes reads your public GitHub
activity and charges you for all of it, with a statute number and a sentence.

A sample of the docket:

| Charge | Statute | What it means |
| --- | --- | --- |
| Reckless Endangerment | § 401.A | Unprotected pushes straight to `main` |
| Obstruction of Clarity | § 118.2 | Commits that say nothing: "fix", "wip", "." |
| Disturbing the Peace | § 290.1 | Commits logged between 1 and 4 AM |
| Sabbath Breaking | § 311.2 | Weekend commits. Touch grass. |
| Abandonment of Property | § 510.7 | Repos left for dead, 1yr+ untouched |
| Verbal Assault | § 240.6 | Profanity in commit messages |

…and a dozen more in [`lib/charges.ts`](lib/charges.ts).

## How it works

1. **Book anyone.** Type a GitHub handle and get an instant rap sheet, a shareable
   mugshot card, and a README badge.
2. **Claim yours.** Sign in with GitHub to claim your record and land on the
   public [Most Wanted](https://commitcrimes.dev/wanted) board.
3. **Go deep.** Opt in to a Deep Record that also counts your **private** repos
   for the full sentence.

It's parody, built entirely on already-public data (unless you sign in for the
deep version). The charges aren't real.

## Privacy

The whole project rests on one rule:

- We read commit **metadata only** (messages, timestamps, counts). **We never
  read your source code** — there is no code path that fetches file contents.
- Public lookups cache only the computed record (handle, sentence, charge
  titles + counts).
- A Deep Record uses your GitHub token in the moment and discards it. Private
  data is **never stored** unless you explicitly publish, and even then only
  counts + public-derived stats ship. Never repo names, never commit text.
- Remove yourself anytime at [commitcrimes.dev/remove](https://commitcrimes.dev/remove).

Full details: [/privacy](https://commitcrimes.dev/privacy) · [SECURITY.md](SECURITY.md)

## Wear your record

Claim your record, then drop the badge in your profile README. Here's the
maintainer's, live:

[![CommitCrimes](https://commitcrimes.dev/badge/zvoque.svg)](https://commitcrimes.dev/u/zvoque)

```md
[![CommitCrimes](https://commitcrimes.dev/badge/YOUR_HANDLE.svg)](https://commitcrimes.dev/u/YOUR_HANDLE)
```

## Stack

- **Next.js** (App Router) + React + Tailwind
- **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare)
- **Neon** Postgres + **Drizzle ORM** for the read-through record cache
- **Clerk** for GitHub auth (base `read:user`, runtime `repo` step-up for Deep)
- **PostHog** for cookieless analytics + error tracking
- Share cards, OG images, and badges rendered server-side with `next/og`

## Local development

```bash
pnpm install
pnpm dev
```

Copy [`.env.example`](.env.example) to `.env.local` and fill what you need.
Everything is optional locally: with no GitHub token you just get lower rate
limits, and Clerk (sign-in / Deep Record) and the database (cache / Most Wanted)
are no-ops when unset, so the public booking flow still works.

```bash
pnpm test                # charge-engine tests
pnpm exec tsc --noEmit   # types
pnpm run deploy          # build with OpenNext + ship to Cloudflare
```

Production secrets live in Cloudflare (`wrangler secret put …`); only publishable
keys sit in `wrangler.toml`.

## Project layout

```
app/         routes, metadata files, OG + sheet + badge image endpoints
components/  RapSheet, ResultView, search, share, footer
lib/         charges.ts (the engine), github.ts, deep.ts, store.ts, db/
drizzle/     SQL migrations
```

## Contributing

The best PR is a new charge. See [CONTRIBUTING.md](CONTRIBUTING.md) for the
charge guide and the privacy invariant every change must keep.

## License

[MIT](LICENSE). The CommitCrimes name, logo, and the commitcrimes.dev domain are
not covered by the license. Fork the code freely; please run it under your own
name.

<div align="center">

Parody. Not real charges or convictions. Not affiliated with GitHub, Inc.

</div>
