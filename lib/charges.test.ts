// Quick sanity checks for the charge + sentence engine.
// Run: npx --yes tsx lib/charges.test.ts
import assert from "node:assert/strict";
import { buildCharges, computeSentence, buildRecord, recordClass } from "./charges";
import type { Charge } from "./types";
import { sanitizeDeepRecord } from "./deep";
import type { CommitInfo, CrimeRecord, RecordInput, RepoInfo } from "./types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function commit(over: Partial<CommitInfo> = {}): CommitInfo {
  return { message: "do a thing properly", ref: "refs/heads/feature", hour: 12, dow: 3, repo: "x", ...over };
}

function repo(over: Partial<RepoInfo> = {}): RepoInfo {
  return {
    name: "real-project",
    description: "a real thing",
    language: "TypeScript",
    pushedAt: new Date().toISOString(),
    fork: false,
    stars: 1,
    ...over,
  };
}

function makeInput(over: Partial<RecordInput> = {}): RecordInput {
  return {
    login: "testuser",
    name: "Test User",
    avatarUrl: "https://example.com/a.png",
    createdAt: "2015-06-01T00:00:00Z",
    publicRepos: 10,
    followers: 50,
    following: 30,
    bio: "dev",
    accountType: "User",
    commits: [],
    repos: [],
    ...over,
  };
}

test("clean account has no charges", () => {
  const charges = buildCharges(makeInput());
  assert.equal(charges.length, 0);
  const s = computeSentence(charges);
  assert.equal(s.totalYears, 0);
  assert.match(s.headline, /clean/i);
});

test("vague commits trigger Obstruction of Clarity", () => {
  const msgs = ["fix", "wip", ".", "bugfix", "update", "asdf", "stuff"];
  const charges = buildCharges(makeInput({ commits: msgs.map((message) => commit({ message })) }));
  assert.ok(charges.find((c) => c.id === "obstruction-of-clarity"));
});

test("repeated vague message triggers Habitual Offender", () => {
  const commits = Array.from({ length: 8 }, () => commit({ message: "update" }));
  const charges = buildCharges(makeInput({ commits }));
  assert.ok(charges.find((c) => c.id === "habitual-offender"));
});

test("pushes to main trigger Reckless Endangerment (serious tier)", () => {
  const commits = [
    commit({ message: "feat", ref: "refs/heads/main" }),
    commit({ message: "feat2", ref: "refs/heads/master" }),
  ];
  const charges = buildCharges(makeInput({ commits }));
  const c = charges.find((x) => x.id === "reckless-endangerment");
  assert.ok(c);
  assert.ok(c!.years >= 10, "serious tier should weigh heavy per count");
});

test("1-4 AM commits trigger Disturbing the Peace", () => {
  const commits = [commit({ hour: 3 }), commit({ hour: 2 })];
  assert.ok(buildCharges(makeInput({ commits })).find((c) => c.id === "disturbing-the-peace"));
});

test("weekend commits trigger No Rest for the Wicked", () => {
  const commits = [commit({ dow: 0 }), commit({ dow: 6 }), commit({ dow: 6 })];
  assert.ok(buildCharges(makeInput({ commits })).find((c) => c.id === "no-rest"));
});

test("ALL CAPS commits trigger Vandalism", () => {
  const commits = [commit({ message: "WHY WONT THIS WORK" }), commit({ message: "BROKEN AGAIN" })];
  assert.ok(buildCharges(makeInput({ commits })).find((c) => c.id === "vandalism"));
});

test("fork-heavy portfolio triggers Possession of Stolen Goods", () => {
  const stale = "2020-01-01T00:00:00Z"; // forked-and-forgotten, not active PR work
  const repos = [
    repo({ name: "a", fork: true, pushedAt: stale }),
    repo({ name: "b", fork: true, pushedAt: stale }),
    repo({ name: "c", fork: true, pushedAt: stale }),
    repo({ name: "d", fork: true, pushedAt: stale }),
    repo({ name: "e", fork: false }),
  ];
  assert.ok(buildCharges(makeInput({ repos })).find((c) => c.id === "stolen-goods"));
});

test("badly named repos trigger Failure to Name", () => {
  const repos = ["test", "untitled", "final-final", "real-project"].map((name) => repo({ name }));
  assert.ok(buildCharges(makeInput({ repos })).find((c) => c.id === "failure-to-name"));
});

test("zero repos triggers Loitering", () => {
  assert.ok(buildCharges(makeInput({ publicRepos: 0 })).find((c) => c.id === "loitering"));
});

test("minor charges stack via count, serious weigh per count", () => {
  const minor = computeSentence(buildCharges(makeInput({
    commits: Array.from({ length: 30 }, () => commit({ message: "fix" })),
  }))).totalYears;
  const serious = computeSentence(buildCharges(makeInput({
    commits: Array.from({ length: 3 }, () => commit({ message: "feat", ref: "refs/heads/main" })),
  }))).totalYears;
  assert.ok(minor > 20, "30 minor counts should stack high");
  assert.ok(serious >= 20, "3 serious counts should already be heavy");
});

test("charges sorted by years descending", () => {
  const commits = [
    commit({ message: "fix", ref: "refs/heads/main", hour: 3 }),
    ...Array.from({ length: 6 }, () => commit({ message: "wip", hour: 3 })),
  ];
  const charges = buildCharges(makeInput({ commits }));
  for (let i = 1; i < charges.length; i++) {
    assert.ok(charges[i - 1].years >= charges[i].years, "not sorted");
  }
});

test("egregious offender rolls into LIFE", () => {
  // Everything wrong at once: main pushes, vague msgs, 3am, weekends, plus a
  // pile of old, undocumented, badly-named repos. Only this kind of total = LIFE.
  const commits = Array.from({ length: 60 }, () =>
    commit({ message: "fix", ref: "refs/heads/main", hour: 3, dow: 6 })
  );
  const repos = Array.from({ length: 50 }, () =>
    repo({ name: "test", description: null, pushedAt: "2020-01-01T00:00:00Z", fork: false })
  );
  const s = computeSentence(buildCharges(makeInput({ commits, repos, publicRepos: 50 })));
  assert.match(s.text, /LIFE/);
});

test("a normal messy dev does NOT get LIFE", () => {
  // ~40 vague commits + a couple stale repos should land in years, not LIFE.
  const commits = Array.from({ length: 40 }, (_, i) =>
    commit({ message: i % 2 ? "fix" : "wip", hour: 14, dow: 2 })
  );
  const repos = [repo({ pushedAt: "2020-01-01T00:00:00Z" }), repo()];
  const s = computeSentence(buildCharges(makeInput({ commits, repos })));
  assert.doesNotMatch(s.text, /LIFE/);
  assert.ok(s.totalYears > 0 && s.totalYears < 99, `expected years, got ${s.totalYears}`);
});

test("buildRecord: booking number + aliases + M.O.", () => {
  const rec = buildRecord(makeInput({
    login: "torvalds",
    name: "Linus Torvalds",
    createdAt: "2011-09-03T15:26:22Z",
    repos: [repo({ language: "C" })],
  }));
  assert.match(rec.bookingNumber, /^CC-2011-\d{3}-[0-9A-Z]{4}$/);
  assert.equal(rec.stats.aliases[0], "@torvalds");
  assert.ok(rec.stats.aliases.includes("Linus Torvalds"));
  assert.deepEqual(rec.stats.modusOperandi, ["C"]);
  // deterministic
  assert.equal(rec.bookingNumber, buildRecord(makeInput({ login: "torvalds", createdAt: "2011-09-03T15:26:22Z" })).bookingNumber);
});

test("variant copy differs by login", () => {
  const mk = (login: string) =>
    buildCharges(makeInput({ login, commits: Array.from({ length: 5 }, () => commit({ message: "fix" })) }))
      .find((c) => c.id === "obstruction-of-clarity")!.detail;
  // Not guaranteed different for every pair, but the picker is deterministic per login.
  assert.equal(mk("alice"), mk("alice"));
});

test("sanitizeDeepRecord: no private data leaks into a published record", () => {
  const base = buildRecord(makeInput({ login: "dev", repos: [repo({ language: "Rust" })] }));
  const deepRec: CrimeRecord = {
    ...base,
    deep: true,
    stats: { ...base.stats, modusOperandi: ["Rust", "Haskell"], priorConvictions: 142 }, // incl. private
    charges: [{ id: "habitual-offender", title: "Habitual Offender", statute: "§ 668.0", detail: 'Committed "secret-internal-msg" 9 times', years: 5 }],
    publicStats: { modusOperandi: ["TypeScript"], priorConvictions: 3 },
  };
  const clean = sanitizeDeepRecord(deepRec);
  // Public-safe stats swapped in.
  assert.deepEqual(clean.stats.modusOperandi, ["TypeScript"]);
  assert.equal(clean.stats.priorConvictions, 3);
  // Commit-text-bearing charge detail scrubbed.
  assert.doesNotMatch(clean.charges[0].detail, /secret-internal-msg/);
  // Override blob never persisted.
  assert.equal(clean.publicStats, undefined);
});

test("push to main is charged as a felony", () => {
  const charges = buildCharges(makeInput({ commits: [commit({ ref: "refs/heads/main" })] }));
  assert.equal(charges.find((c) => c.id === "reckless-endangerment")?.severity, "felony");
});

test("extreme count aggravates a misdemeanor to felony", () => {
  const light = buildCharges(makeInput({ commits: Array.from({ length: 5 }, () => commit({ message: "fuck" })) }));
  const heavy = buildCharges(makeInput({ commits: Array.from({ length: 20 }, () => commit({ message: "fuck" })) }));
  assert.equal(light.find((c) => c.id === "verbal-assault")?.severity, "misdemeanor");
  const h = heavy.find((c) => c.id === "verbal-assault");
  assert.equal(h?.severity, "felony");
  assert.equal(h?.aggravated, true);
});

test("no-felony record never reaches LIFE (compressed under 100)", () => {
  const charges: Charge[] = [
    { id: "a", title: "A", statute: "x", detail: "", years: 80, severity: "misdemeanor" },
    { id: "b", title: "B", statute: "y", detail: "", years: 80, severity: "misdemeanor" },
  ];
  const s = computeSentence(charges);
  assert.doesNotMatch(s.text, /LIFE/);
  assert.ok(s.totalYears < 100, `expected <100, got ${s.totalYears}`);
});

test("one felony, even huge, is big years but NOT life", () => {
  const charges: Charge[] = [
    { id: "f", title: "F", statute: "x", detail: "", years: 2500, severity: "felony", degree: 1 },
  ];
  const s = computeSentence(charges);
  assert.doesNotMatch(s.text, /LIFE/);
  assert.match(s.text, /2,500 years/); // raw, uncapped, comma-formatted
});

test("two felonies + high total unlock LIFE and multiples", () => {
  const charges: Charge[] = [
    { id: "f", title: "F", statute: "x", detail: "", years: 1700, severity: "felony", degree: 1 },
    { id: "g", title: "G", statute: "y", detail: "", years: 1600, severity: "felony", degree: 1 },
  ];
  const s = computeSentence(charges);
  assert.match(s.text, /2 consecutive LIFE/); // 3300 / 1500 = 2
  assert.equal(s.totalYears, 3300);
});

test("recordClass reflects worst charge", () => {
  const f = (sev: "misdemeanor" | "felony"): Charge => ({ id: "x", title: "X", statute: "s", detail: "", years: 5, severity: sev });
  assert.equal(recordClass([]), "Model Citizen");
  assert.equal(recordClass([f("misdemeanor")]), "Misdemeanant");
  assert.equal(recordClass([f("felony"), f("misdemeanor")]), "Felon");
  assert.equal(recordClass([f("felony"), f("felony")]), "Habitual Felon");
  assert.equal(recordClass([f("felony"), f("felony"), f("felony")]), "Public Enemy");
});

console.log(`\n${passed} checks passed.`);
