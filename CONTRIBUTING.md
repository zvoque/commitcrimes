# Contributing to CommitCrimes

Thanks for wanting to help book developers for crimes against version control.

The single best contribution is a **new charge** — a funny, fair crime that
anyone's public GitHub history might be guilty of. PRs that add one charge plus
its test are the easiest to review and merge.

## The one rule that matters: never expose private data

CommitCrimes can read a signed-in user's **private** repo metadata for a Deep
Record. The whole project rests on one invariant — **keep it or the PR is a
hard no**:

- We read commit **metadata only** (messages, timestamps, counts). We never
  read source code, and there is no code path that fetches file contents
  (`/contents`, `/git/blobs`, `/git/trees`, raw, diff). Don't add one.
- Charge `detail` strings are **count-based**. Never interpolate a repo name,
  repo description, or a raw commit message into output.
- Anything that gets stored or shared (badge, OG card, `/api/sheet`, the
  published Most Wanted record) must contain only sentence + charge titles +
  counts + public-derived stats. `lib/deep.ts → sanitizeDeepRecord` enforces
  this for published deep records — don't route around it.

If a change makes the app see, store, or display anything private beyond
counts, it won't be merged.

## Add a charge

Charges live in [`lib/charges.ts`](lib/charges.ts). Each one inspects the
normalized `RecordInput` (public profile, repo metadata, commit messages +
timestamps) and, if the pattern matches, pushes a charge via `add()`:

```ts
add({
  id: "your-charge-id",
  title: "Your Charge Title",          // sounds like a real crime
  statute: "§ 123.4",                  // made-up code, rendered as §123-4
  detail: `${count} commits that ...`, // count-based; no repo names / commit text
  base: 2, perCount: 2, count, cap: 16,
});
```

Sentencing is `score = clamp(base + perCount * count, base, cap)`:

- **Minor, stacking crimes** (vague messages, late-night commits): low `base`,
  small `perCount`, higher `cap` — they add up over many counts.
- **Serious one-offs** (force-pushing to main, abandoning repos): higher `base`
  / `perCount`, lower `cap`.

Keep it **playful and punching up** — roast habits, not people.

Every charge needs a test in [`lib/charges.test.ts`](lib/charges.test.ts):
assert it fires on the matching input and stays quiet otherwise.

## Local setup

```bash
pnpm install
pnpm dev          # http://localhost:3009 (or whatever Next picks)
```

Copy [`.env.example`](.env.example) to `.env.local` and fill what you need.
Everything is optional locally: with no GitHub token you get lower rate limits,
and Clerk (sign-in / Deep Record) and the database (cache / Most Wanted) are
no-ops when unset, so the public booking flow still works.

This app runs on **Cloudflare Workers via OpenNext** and targets a recent
Next.js — some APIs and file conventions differ from older Next. When in doubt,
check the version in [`package.json`](package.json) and the Next docs for it.

## Before you open a PR

```bash
pnpm exec tsc --noEmit   # types must pass
pnpm test                # charge-engine tests must pass
```

Keep PRs focused — one charge, one fix, or one feature. Describe what changed
and why. New charges: include an example of the `detail` text.

## Reporting bugs / ideas

Open an issue. For anything security- or privacy-related, see
[SECURITY.md](SECURITY.md) instead of filing a public issue.

## Not affiliated with GitHub

CommitCrimes is a parody project. It is not affiliated with or endorsed by
GitHub, Inc. Charges are jokes, not real accusations — keep contributions in
that spirit.
