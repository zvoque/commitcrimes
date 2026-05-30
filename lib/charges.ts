// CommitCrimes charge + sentence engine.
// Pure, dependency-free functions over normalized GitHub data.
// The humor lives here — tune copy freely.

import type {
  RecordInput,
  Charge,
  Sentence,
  CrimeRecord,
  RepoInfo,
  CommitInfo,
  Severity,
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

// A commit message is "vague" only if it's a bare low-effort line — NOT a
// conventional commit with a real description ("fix: handle null in parser").
// Strips a leading "type:" / "type(scope):" and bails if real content follows.
function isVagueMessage(msg: string): boolean {
  const line = firstLine(msg);
  const body = line.replace(/^[a-z]+(\([^)]*\))?:\s*/i, "");
  if (body !== line && body.length >= 6) return false; // had a "type:" + description
  if (line.length > 20) return false; // long freeform message carries content
  return VAGUE_MESSAGES.some((re) => re.test(line));
}

// Late-night commits in the dev's LOCAL time. We only have UTC timestamps, so
// estimate their offset from the busiest commit hour (assume peak ≈ 15:00 local)
// and flag genuine local 1-4 AM. Avoids charging non-UTC devs for daytime work.
function lateNightCount(commits: CommitInfo[]): number {
  if (commits.length < 8) return commits.filter((c) => c.hour >= 1 && c.hour <= 4).length;
  const byHour = new Array(24).fill(0);
  for (const c of commits) byHour[c.hour]++;
  let peak = 0;
  for (let h = 1; h < 24; h++) if (byHour[h] > byHour[peak]) peak = h;
  const offset = 15 - peak; // local = (utc + offset) mod 24
  return commits.filter((c) => {
    const local = (((c.hour + offset) % 24) + 24) % 24;
    return local >= 1 && local <= 4;
  }).length;
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
  // classification
  severity?: Severity; // defaults to "misdemeanor"
  aggravatedAt?: number; // count at/above which a misdemeanor escalates to felony
}

function score(s: Spec): number {
  return clamp(s.base + s.perCount * s.count, Math.min(s.base + s.perCount, s.cap), s.cap);
}

// Felony degree from the charge's weight: 1° (worst) .. 3°.
function felonyDegree(years: number): number {
  return years >= 500 ? 1 : years >= 120 ? 2 : 3;
}

export function buildCharges(input: RecordInput): Charge[] {
  const charges: Charge[] = [];
  const login = input.login;
  const { commits } = input;
  const real = input.repos.filter((r) => !r.fork);
  const now = Date.now();
  const add = (s: Spec) => {
    const years = score(s);
    let severity: Severity = s.severity ?? "misdemeanor";
    let aggravated = false;
    if (severity === "misdemeanor" && s.aggravatedAt != null && s.count >= s.aggravatedAt) {
      severity = "felony";
      aggravated = true;
    }
    charges.push({
      id: s.id,
      title: s.title,
      statute: s.statute,
      detail: s.detail,
      years,
      severity,
      ...(severity === "felony" ? { degree: felonyDegree(years) } : {}),
      ...(aggravated ? { aggravated: true } : {}),
    });
  };

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
      base: 15, perCount: 30, count: mainPushes, cap: 6000, // headroom for 3x-4x LIFE whales
      severity: "felony", // pushing straight to main, no review: cardinal sin
    });
  }

  // Possession of Stolen Goods — a portfolio of forks left to rot. Active
  // contribution forks (recently pushed) are exempt, so OSS contributors aren't
  // charged for PR work — only forked-and-forgotten repos count.
  const staleForks = input.repos.filter(
    (r) => r.fork && now - new Date(r.pushedAt).getTime() > YEAR_MS
  ).length;
  if (input.repos.length >= 5 && staleForks / input.repos.length > 0.5) {
    add({
      id: "stolen-goods",
      title: "Possession of Stolen Goods",
      statute: "§ 165.4",
      detail: `${staleForks} of ${input.repos.length} repos are forks left to rot, mostly other people's work`,
      base: 50, perCount: 0, count: 0, cap: 50,
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
      base: 30, perCount: 0, count: 0, cap: 30,
    });
  }

  // Fled the Jurisdiction — once active, now a ghost.
  const lastPush = real.reduce((m, r) => Math.max(m, new Date(r.pushedAt).getTime()), 0);
  if (real.length >= 2 && lastPush > 0 && now - lastPush > 2 * YEAR_MS) {
    const yrs = Math.floor((now - lastPush) / YEAR_MS);
    add({
      id: "fugitive",
      title: "Fled the Jurisdiction",
      statute: "§ 836.0",
      detail: `No public activity in ${yrs} years. Whereabouts unknown.`,
      base: 60, perCount: 0, count: 0, cap: 60,
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
      base: 5, perCount: 6, count: swears, cap: 250,
      aggravatedAt: 20, // 20+ profane commits: aggravated
    });
  }

  // Abandonment of Property — repos started and dropped. Stale (1yr+ untouched)
  // AND low-traction (<3 stars): a finished, popular library left untouched is
  // STABLE, not abandoned, so stars exempt it. Only counts the junk nobody uses.
  const abandoned = real.filter(
    (r) => r.stars < 3 && now - new Date(r.pushedAt).getTime() > YEAR_MS
  ).length;
  if (abandoned > 0) {
    add({
      id: "abandonment",
      title: "Abandonment of Property",
      statute: "§ 510.7",
      detail: `${abandoned} repo${plural(abandoned)} left for dead: no stars, untouched 1yr+`,
      base: 0, perCount: 1, count: abandoned, cap: 30,
    });
  }

  // Habitual Offender — same exact low-effort message used over and over.
  const msgCounts = new Map<string, number>();
  for (const c of commits) {
    if (!isVagueMessage(c.message)) continue;
    const m = firstLine(c.message).toLowerCase();
    msgCounts.set(m, (msgCounts.get(m) ?? 0) + 1);
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
      base: 40, perCount: 0, count: repeatN, cap: 40,
      aggravatedAt: 30, // 30+ identical low-effort messages: aggravated
    });
  }

  // ---- MINOR: low years per count, but they stack ----

  // Obstruction of Clarity — vague commit messages.
  const vague = commits.filter((c) => isVagueMessage(c.message)).length;
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
      base: 1, perCount: 1, count: vague, cap: 150,
      aggravatedAt: 120, // 120+ meaningless commits: aggravated
    });
  }

  // Disturbing the Peace — commits between 1-4 AM (UTC).
  const lateNight = lateNightCount(commits);
  if (lateNight > 0) {
    add({
      id: "disturbing-the-peace",
      title: "Disturbing the Peace",
      statute: "§ 290.1",
      detail: pick(login, "night", [
        `${lateNight} commit${plural(lateNight)} logged between 1 and 4 AM`,
        `${lateNight} commit${plural(lateNight)} pushed between 1 and 4 AM. Go to bed.`,
      ]),
      base: 2, perCount: 2, count: lateNight, cap: 70,
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
      base: 0, perCount: 2, count: weekend, cap: 60,
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
      base: 5, perCount: 8, count: shouting, cap: 250,
      aggravatedAt: 12, // 12+ all-caps tirades: aggravated
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
      base: 2, perCount: 3, count: badNamed, cap: 45,
    });
  }

  // Repo Hoarding — too many repos.
  if (input.publicRepos > 80) {
    const over = input.publicRepos - 80;
    add({
      id: "hoarding",
      title: "Repo Hoarding",
      statute: "§ 496.0",
      detail: `${input.publicRepos} public repos. Some of these you forgot exist.`,
      base: 2, perCount: 2, count: Math.floor(over / 10), cap: 60,
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
      base: 20, perCount: 0, count: 0, cap: 20,
    });
  } else if (input.following > Math.max(10, input.followers * 3)) {
    add({
      id: "loitering",
      title: "Loitering with Intent",
      statute: "§ 647.0",
      detail: `Follows ${input.following}, followed by ${input.followers}. Professional lurker.`,
      base: 15, perCount: 0, count: 0, cap: 15,
    });
  }

  // Identity Concealment — no name, no bio.
  if (!input.name && !input.bio) {
    add({
      id: "identity-concealment",
      title: "Identity Concealment",
      statute: "§ 530.5",
      detail: "No name. No bio. Operating entirely in the shadows.",
      base: 20, perCount: 0, count: 0, cap: 20,
    });
  }

  // Habitual Misdemeanant — relentless petty crime escalates to a felony, like
  // real habitual-offender statutes. Only when there's no felony yet AND the
  // record is genuinely prolific, so felony/LIFE stay rare and earned. Flips the
  // offender to Felon, which lifts the misdemeanant cap so the number runs real.
  const felonyN = charges.filter((c) => c.severity === "felony").length;
  if (felonyN === 0) {
    const misd = charges.filter((c) => (c.severity ?? "misdemeanor") === "misdemeanor");
    const misdSum = misd.reduce((s, c) => s + c.years, 0);
    if (misd.length >= 6 || misdSum >= 150) {
      add({
        id: "habitual-misdemeanant",
        title: "Habitual Misdemeanant",
        statute: "§ 1170.12",
        detail: `${misd.length} petty offenses on record. Volume this high is its own felony.`,
        base: clamp(Math.round(misdSum * 0.6), 80, 600), perCount: 0, count: 0, cap: 600,
        severity: "felony",
      });
    }
  }

  return charges.sort((a, b) => b.years - a.years);
}

// LIFE is reserved for the genuinely egregious: it needs BREADTH (>= 2 felony
// charges — multiple severe crimes) AND DEPTH (a massive total). A heavy single-
// felony record still shows a big raw number, just not LIFE. Tunable.
const LIFE_FELONIES = 2;
const LIFE_BAR = 1500;
const LIFE_UNIT = 1500; // years per consecutive LIFE sentence (drives multiples)

function felonyCount(charges: Charge[]): number {
  return charges.filter((c) => (c.severity ?? "misdemeanor") === "felony").length;
}

// A no-felony record can pile on years but never reaches LIFE; compress its tail
// asymptotically below 100 so heavy-but-petty offenders stay distinct and the
// "100+ years" mark always means a felony is present. Tunable.
function softCapMisdemeanant(raw: number): number {
  const KNEE = 70, CEIL = 98, SCALE = 30;
  if (raw <= KNEE) return raw;
  return Math.round(KNEE + (CEIL - KNEE) * (1 - SCALE / (SCALE + raw - KNEE)));
}

// Thousands separators, safe in every runtime (no toLocaleString quirks).
function commas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Whole-record label by worst charge present.
export function recordClass(charges: Charge[]): string {
  if (charges.length === 0) return "Model Citizen"; // clean = a rare flex, not a dead end
  const felonies = felonyCount(charges);
  if (felonies >= 3) return "Public Enemy";
  if (felonies >= 2) return "Habitual Felon";
  if (felonies === 1) return "Felon";
  return "Misdemeanant";
}

export function computeSentence(charges: Charge[]): Sentence {
  const raw = charges.reduce((sum, c) => sum + c.years, 0);

  if (raw === 0) {
    return {
      totalYears: 0,
      text: "Released, no priors",
      lead: null,
      otherCount: 0,
      headline: "No priors on record. Suspiciously clean.",
    };
  }

  const felonies = felonyCount(charges);
  // Felons keep their raw (big) total; petty records compress below 100.
  const totalYears = felonies > 0 ? raw : softCapMisdemeanant(raw);
  const lead = charges[0];
  const otherCount = charges.length - 1;

  let text: string;
  if (felonies >= LIFE_FELONIES && totalYears >= LIFE_BAR) {
    const lives = Math.floor(totalYears / LIFE_UNIT);
    text = `${lives} consecutive LIFE sentence${plural(lives)}`;
  } else {
    text = `${commas(totalYears)} years`;
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
    recordClass: recordClass(charges),
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
