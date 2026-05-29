# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security or privacy problems.

Email **prod@zvoque.com** with:

- what you found and where (file/route),
- steps to reproduce or a proof of concept,
- the impact you think it has.

You'll get an acknowledgement, and confirmed issues will be fixed and disclosed
once a patch is out. Good-faith research is welcome — please don't run
automated scans against the live site or access data that isn't yours.

## What's especially sensitive

CommitCrimes handles a few things worth extra scrutiny:

- **GitHub OAuth tokens** (Deep Record): used in-request only and never
  persisted. A bug that logs, stores, or transmits a token elsewhere is
  high severity.
- **Private repo metadata**: the app may read a signed-in user's private repo
  metadata to compute a Deep Record. Only counts, charge titles, and
  public-derived stats may ever be stored or displayed — never repo names,
  commit text, or source code. Anything that leaks private data beyond counts
  is a vulnerability (see the privacy invariant in
  [CONTRIBUTING.md](CONTRIBUTING.md)).
- **Record removal**: `/remove` must reliably erase a record and block future
  re-booking.

## Out of scope

- The mock charges/sentences themselves (they're parody, not real data).
- Rate-limiter or cache layers failing **open** during an outage — this is
  intentional so the app degrades gracefully; report only if it enables a
  concrete abuse.
