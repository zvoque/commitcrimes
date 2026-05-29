// Shared types for the CommitCrimes charge + sentence engine.

export interface CommitInfo {
  message: string;
  ref: string; // e.g. "refs/heads/main"
  hour: number; // UTC hour 0-23 the commit/push happened
  dow: number; // UTC day of week, 0=Sun .. 6=Sat
  repo: string;
}

export interface RepoInfo {
  name: string;
  description: string | null;
  language: string | null;
  pushedAt: string; // ISO
  fork: boolean;
  stars: number;
}

// Normalized input the engine operates on (built from GitHub API in lib/github.ts).
export interface RecordInput {
  login: string;
  name: string | null;
  avatarUrl: string;
  createdAt: string; // ISO
  publicRepos: number;
  followers: number;
  following: number;
  bio: string | null;
  accountType: string; // "User" | "Organization"
  commits: CommitInfo[];
  repos: RepoInfo[];
}

export interface Charge {
  id: string;
  title: string;
  statute: string;
  detail: string;
  years: number;
}

export interface Sentence {
  totalYears: number;
  text: string; // human-readable, e.g. "2 consecutive LIFE sentences + 12 years"
  lead: Charge | null;
  otherCount: number;
  headline: string;
}

export interface RecordStats {
  aliases: string[]; // a.k.a. — handle + name
  modusOperandi: string[]; // top languages (M.O.)
  priorConvictions: number; // public repos
  knownAssociates: number; // followers
  memberSince: number; // year
  heightYears: number; // account age, used as mugshot "height"
  topLanguage: string;
}

export interface CrimeRecord {
  login: string;
  name: string;
  avatarUrl: string;
  bookingNumber: string;
  charges: Charge[];
  sentence: Sentence;
  stats: RecordStats;
  deep?: boolean; // includes private-repo data (via opt-in GitHub App)
  // Public-safe stat overrides for a deep record, computed at build time from
  // PUBLIC repos only. Applied by sanitizeDeepRecord before publishing so the
  // public M.O. / prior-convictions never reflect private repos. Never rendered
  // directly and stripped before the record is persisted.
  publicStats?: { modusOperandi: string[]; priorConvictions: number };
}
