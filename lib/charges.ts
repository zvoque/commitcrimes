// CommitCrimes charge + sentence engine.
// Pure, dependency-free functions over normalized GitHub data.
// The humor lives here — tune copy freely.

import type {
  RecordInput,
  Charge,
  Sentence,
  CrimeRecord,
  RepoInfo,
} from "./types";

// Genuinely low-information / placeholder commit messages.
const VAGUE_MESSAGES: RegExp[] = [
  /^fix(es|ed|ing)?\b/i,
  /^bug ?fix(es|ed|ing)?\b/i,
  /^hot ?fix\b/i,
  /^(quick|small|minor|tiny|final|real|actual|another|one ?more|last) fix\b/i,
  /^wip\b/i,
  /^\.+$/,
  /^,+$/,
  /^-+$/,
  /^updates?\b/i,
  /^updated?\b/i,
  /^asdf+/i,
  /^a?sdf/i,
  /^qwer/i,
  /^stuff\b/i,
  /^things?\b/i,
  /^changes?\b/i,
  /^oops/i,
  /^typo/i,
  /^misc\b/i,
  /^clean ?up\b/i,
  /^final\b/i,
  /^revert/i,
  /^undo\b/i,
  /^redo\b/i,
  /^retry\b/i,
  /^again\b/i,
  /^test(ing| commit)?\b/i,
  /^tmp\b/i,
  /^temp\b/i,
  /^debug(ging)?\b/i,
  /^saves?\b/i,
  /^saving\b/i,
  /^commit\b/i,
  /^.$/,
  /^x+$/i,
  /^(please|plz|pls)\b/i,
  /^idk\b/i,
  /^ugh\b/i,
  /^no message/i,
  /^minor\b/i,
  /^small\b/i,
  /^edits?\b/i,
  /^nit(s|pick)?\b/i,
];

const BAD_NAMES = new Set([
  "test", "tests", "untitled", "temp", "tmp", "new-project", "newproject",
  "final", "final-final", "copy", "project1", "project-1", "demo", "myproject",
  "my-project", "hello-world", "helloworld", "foo", "bar", "baz", "example",
  "untitled-1", "new", "stuff", "things", "code", "app", "website", "test-repo",
  "learning", "practice", "sandbox", "playground", "scratch",
]);

const PROFANITY: RegExp[] = [/\bf+u+c+k/i, /\bsh+i+t/i, /\bdamn\b/i, /\bcrap\b/i, /\bwtf\b/i, /\bhell\b/i, /\bass(hole)?\b/i, /\bpiss/i];

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function plural(n: number, s = "s"): string {
  return n === 1 ? "" : s;
}

function firstLine(msg: string): string {
  return msg.split("\n")[0].trim();
}

// Simple deterministic hash -> non-negative int.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic per-login variant picker so two people with the same charge
// get different flavor text — makes records feel hand-written / unique.
function pick<T>(login: string, salt: string, arr: T[]): T {
  return arr[hash(login + ":" + salt) % arr.length];
}

interface Spec {
  id: string;
  title: string;
  statute: string;
  detail: string;
  // tiered scoring
  base: number;
  perCount: number;
  count: number;
  cap: number;
}

function score(s: Spec): number {
  return clamp(s.base + s.perCount * s.count, Math.min(s.base + s.perCount, s.cap), s.cap);
}

export function buildCharges(input: RecordInput): Charge[] {
  const charges: Charge[] = [];
  const login = input.login;
  const { commits } = input;
  const real = input.repos.filter((r) => !r.fork);
  const add = (s: Spec) =>
    charges.push({ id: s.id, title: s.title, statute: s.statute, detail: s.detail, years: score(s) });

  // ---- SERIOUS: high years per count ----

  // Reckless Endangerment — direct pushes to main/master.
  const mainPushes = commits.filter((c) => /refs\/heads\/(main|master)$/.test(c.ref)).length;
  if (mainPushes > 0) {
    add({
      id: "reckless-endangerment",
      title: "Reckless Endangerment",
      statute: "§ 401.A",
      detail: pick(login, "reckless", [
        `${mainPushes} unprotected push${plural(mainPushes, "es")} straight to main`,
        `${mainPushes} commit${plural(mainPushes)} shoved into main with no seatbelt`,
        `bypassed code review ${mainPushes} time${plural(mainPushes)}, pushed raw to main`,
      ]),
      base: 8, perCount: 4, count: mainPushes, cap: 30,
    });
  }

  // Possession of Stolen Goods — fork-heavy portfolio.
  const forks = input.repos.filter((r) => r.fork).length;
  if (input.repos.length >= 5 && forks / input.repos.length > 0.55) {
    add({
      id: "stolen-goods",
      title: "Possession of Stolen Goods",
      statute: "§ 165.4",
      detail: `${forks} of ${input.repos.length} repos are forks, mostly other people's work`,
      base: 12, perCount: 0, count: 0, cap: 12,
    });
  }

  // Operating Without Documentation — repos with no description.
  const undocumented = real.filter((r) => !r.description || r.description.trim() === "").length;
  if (real.length >= 3 && undocumented / real.length > 0.5) {
    add({
      id: "no-docs",
      title: "Operating Without Documentation",
      statute: "§ 230.0",
      detail: pick(login, "nodocs", [
        `${undocumented} of ${real.length} repos shipped with zero description`,
        `${undocumented} repos with no docs, good luck to anyone cloning them`,
      ]),
      base: 6, perCount: 0, count: 0, cap: 6,
    });
  }

  // Fled the Jurisdiction — once active, now a ghost.
  const now = Date.now();
  const lastPush = real.reduce((m, r) => Math.max(m, new Date(r.pushedAt).getTime()), 0);
  if (real.length >= 2 && lastPush > 0 && now - lastPush > 2 * YEAR_MS) {
    const yrs = Math.floor((now - lastPush) / YEAR_MS);
    add({
      id: "fugitive",
      title: "Fled the Jurisdiction",
      statute: "§ 836.0",
      detail: `No public activity in ${yrs} years. Whereabouts unknown.`,
      base: 10, perCount: 0, count: 0, cap: 10,
    });
  }

  // ---- MEDIUM ----

  // Verbal Assault — profanity in commit messages.
  const swears = commits.filter((c) => PROFANITY.some((re) => re.test(c.message))).length;
  if (swears > 0) {
    add({
      id: "verbal-assault",
      title: "Verbal Assault",
      statute: "§ 240.6",
      detail: pick(login, "verbal", [
        `${swears} commit message${plural(swears)} that cursed out the codebase`,
        `${swears} time${plural(swears)} caught swearing at the compiler in writing`,
      ]),
      base: 2, perCount: 2, count: swears, cap: 16,
    });
  }

  // Abandonment of Property — repos untouched > 1 year.
  const abandoned = real.filter((r) => now - new Date(r.pushedAt).getTime() > YEAR_MS).length;
  if (abandoned > 0) {
    add({
      id: "abandonment",
      title: "Abandonment of Property",
      statute: "§ 510.7",
      detail: `${abandoned} repo${plural(abandoned)} left for dead (1yr+ untouched)`,
      base: 0, perCount: 2, count: abandoned, cap: 18,
    });
  }

  // Habitual Offender — same exact low-effort message used over and over.
  const msgCounts = new Map<string, number>();
  for (const c of commits) {
    const m = firstLine(c.message).toLowerCase();
    if (VAGUE_MESSAGES.some((re) => re.test(m))) msgCounts.set(m, (msgCounts.get(m) ?? 0) + 1);
  }
  let repeatMsg = "";
  let repeatN = 0;
  for (const [m, n] of msgCounts) if (n > repeatN) { repeatN = n; repeatMsg = m; }
  if (repeatN >= 6) {
    add({
      id: "habitual-offender",
      title: "Habitual Offender",
      statute: "§ 668.0",
      detail: `Committed "${repeatMsg.slice(0, 20)}" ${repeatN} separate times`,
      base: 5, perCount: 0, count: 0, cap: 5,
    });
  }

  // ---- MINOR: low years per count, but they stack ----

  // Obstruction of Clarity — vague commit messages.
  const vague = commits.filter((c) => VAGUE_MESSAGES.some((re) => re.test(firstLine(c.message)))).length;
  if (vague > 0) {
    add({
      id: "obstruction-of-clarity",
      title: "Obstruction of Clarity",
      statute: "§ 118.2",
      detail: pick(login, "obstruct", [
        `${vague} commit${plural(vague)} that said nothing useful: "fix", "wip", "."`,
        `${vague} commit message${plural(vague)} a stranger could not decode`,
        `${vague} low-effort message${plural(vague)} like "fix" and "stuff"`,
      ]),
      base: 1, perCount: 1, count: vague, cap: 25,
    });
  }

  // Disturbing the Peace — commits between 1-4 AM (UTC).
  const lateNight = commits.filter((c) => c.hour >= 1 && c.hour <= 4).length;
  if (lateNight > 0) {
    add({
      id: "disturbing-the-peace",
      title: "Disturbing the Peace",
      statute: "§ 290.1",
      detail: pick(login, "night", [
        `${lateNight} commit${plural(lateNight)} logged between 1 and 4 AM`,
        `${lateNight} commit${plural(lateNight)} pushed between 1 and 4 AM. Go to bed.`,
      ]),
      base: 1, perCount: 1, count: lateNight, cap: 15,
    });
  }

  // No Rest for the Wicked — weekend commits.
  const weekend = commits.filter((c) => c.dow === 0 || c.dow === 6).length;
  if (weekend >= 3) {
    add({
      id: "no-rest",
      title: "Sabbath Breaking",
      statute: "§ 311.2",
      detail: `${weekend} commit${plural(weekend)} pushed on weekends. Touch grass.`,
      base: 0, perCount: 1, count: weekend, cap: 12,
    });
  }

  // Vandalism — ALL CAPS / shouting commit messages.
  const shouting = commits.filter((c) => {
    const m = firstLine(c.message);
    return m.length >= 6 && /[A-Z]{5,}/.test(m) && m === m.toUpperCase() && /[A-Z]/.test(m);
  }).length;
  if (shouting > 0) {
    add({
      id: "vandalism",
      title: "Vandalism",
      statute: "§ 594.0",
      detail: `${shouting} commit message${plural(shouting)} SCREAMED IN ALL CAPS`,
      base: 1, perCount: 2, count: shouting, cap: 14,
    });
  }

  // Failure to Name — repos named like "untitled" / "test" / "final-final".
  const badNamed = real.filter((r) => BAD_NAMES.has(r.name.toLowerCase())).length;
  if (badNamed > 0) {
    add({
      id: "failure-to-name",
      title: "Failure to Name",
      statute: "§ 101.3",
      detail: `${badNamed} repo${plural(badNamed)} named like "untitled" or "final-final"`,
      base: 1, perCount: 1, count: badNamed, cap: 7,
    });
  }

  // Repo Hoarding — too many repos.
  if (input.publicRepos > 40) {
    const over = input.publicRepos - 40;
    add({
      id: "hoarding",
      title: "Repo Hoarding",
      statute: "§ 496.0",
      detail: `${input.publicRepos} public repos. Some of these you forgot exist.`,
      base: 1, perCount: 1, count: Math.floor(over / 10), cap: 10,
    });
  }

  // Loitering — shipped nothing, or pure lurker. Also require zero real
  // (non-fork) repos so a Deep Record with private work isn't charged for an
  // empty PUBLIC footprint.
  if (input.publicRepos === 0 && input.repos.length === 0) {
    add({
      id: "loitering",
      title: "Loitering",
      statute: "§ 647.0",
      detail: "Account exists. Has shipped absolutely nothing.",
      base: 4, perCount: 0, count: 0, cap: 4,
    });
  } else if (input.following > Math.max(10, input.followers * 3)) {
    add({
      id: "loitering",
      title: "Loitering with Intent",
      statute: "§ 647.0",
      detail: `Follows ${input.following}, followed by ${input.followers}. Professional lurker.`,
      base: 3, perCount: 0, count: 0, cap: 3,
    });
  }

  // Identity Concealment — no name, no bio.
  if (!input.name && !input.bio) {
    add({
      id: "identity-concealment",
      title: "Identity Concealment",
      statute: "§ 530.5",
      detail: "No name. No bio. Operating entirely in the shadows.",
      base: 3, perCount: 0, count: 0, cap: 3,
    });
  }

  return charges.sort((a, b) => b.years - a.years);
}

const LIFE = 99;

export function computeSentence(charges: Charge[]): Sentence {
  const totalYears = charges.reduce((sum, c) => sum + c.years, 0);

  if (totalYears === 0) {
    return {
      totalYears: 0,
      text: "Released, no priors",
      lead: null,
      otherCount: 0,
      headline: "No priors on record. Suspiciously clean.",
    };
  }

  const lead = charges[0];
  const otherCount = charges.length - 1;

  let text: string;
  if (totalYears >= LIFE) {
    const lives = Math.floor(totalYears / LIFE);
    const rem = totalYears % LIFE;
    text = `${lives} consecutive LIFE sentence${plural(lives)}${rem ? ` + ${rem} years` : ""}`;
  } else {
    text = `${totalYears} years`;
  }

  const headline =
    `Sentenced to ${text} for ${lead.title}` +
    (otherCount > 0 ? ` and ${otherCount} other count${plural(otherCount)}` : "");

  return { totalYears, text, lead, otherCount, headline };
}

function countLanguages(repos: RepoInfo[]): string[] {
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (r.fork || !r.language) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([lang]) => lang);
}

function shortHash(s: string): string {
  return (hash(s) >>> 0).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
}

function bookingNumber(login: string, created: Date): string {
  const year = created.getUTCFullYear();
  const start = Date.UTC(year, 0, 0);
  const dayOfYear = Math.floor((created.getTime() - start) / (24 * 60 * 60 * 1000));
  return `CC-${year}-${String(dayOfYear).padStart(3, "0")}-${shortHash(login)}`;
}

export function buildRecord(input: RecordInput): CrimeRecord {
  const charges = buildCharges(input);
  const sentence = computeSentence(charges);
  const created = new Date(input.createdAt);
  const ageYears = Math.max(0, (Date.now() - created.getTime()) / YEAR_MS);
  const langs = countLanguages(input.repos);

  const aliases: string[] = [`@${input.login}`];
  if (input.name && input.name.toLowerCase() !== input.login.toLowerCase()) {
    aliases.push(input.name);
  }

  return {
    login: input.login,
    name: input.name || input.login,
    avatarUrl: input.avatarUrl,
    bookingNumber: bookingNumber(input.login, created),
    charges,
    sentence,
    stats: {
      aliases,
      modusOperandi: langs.length ? langs.slice(0, 3) : ["Unknown"],
      priorConvictions: Math.max(input.publicRepos, input.repos.length),
      knownAssociates: input.followers,
      memberSince: created.getUTCFullYear(),
      heightYears: Math.round(ageYears * 10) / 10,
      topLanguage: langs[0] ?? "Unknown",
    },
  };
}
