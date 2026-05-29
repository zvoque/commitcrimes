// Deep Record: analyze the signed-in user's own account INCLUDING private repos,
// using their GitHub OAuth token (obtained via Clerk's GitHub social connection,
// which must be configured with the `repo` + `read:user` scopes).
// The token is used in-request only and never stored. Deep records are not
// persisted to the DB (see lib/store.ts) — public badge/leaderboard stay public.
import { buildRecord } from "./charges";
import type { CommitInfo, CrimeRecord, RecordInput, RepoInfo } from "./types";

const API = "https://api.github.com";
const MAX_REPOS = 25;
const MAX_COMMITS = 600;

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "commitcrimes.dev",
    Authorization: `Bearer ${token}`,
  };
}

async function gh<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { headers: headers(token), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  created_at: string;
  public_repos: number;
  followers: number;
  following: number;
  bio: string | null;
  type: string;
}

interface GhRepo {
  name: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  fork: boolean;
  private: boolean;
  stargazers_count: number;
}

// Top languages across PUBLIC, non-fork repos only — used as the public-safe
// M.O. for a published deep record (so private languages never leak).
function publicLanguages(repos: GhRepo[]): string[] {
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (r.private || r.fork || !r.language) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l).slice(0, 3);
  return top.length ? top : ["Undisclosed"];
}

interface GhCommit {
  commit: { message: string; author: { date: string } | null };
}

export async function getDeepRecordForToken(token: string): Promise<CrimeRecord | null> {
  const user = await gh<GhUser>("/user", token);
  if (!user) return null;
  const login = user.login;

  // affiliation=owner + visibility=all → the user's own public AND private repos.
  const repos =
    (await gh<GhRepo[]>(
      "/user/repos?per_page=100&sort=pushed&affiliation=owner&visibility=all",
      token
    )) ?? [];

  const repoInfos: RepoInfo[] = repos.map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    pushedAt: r.pushed_at,
    fork: r.fork,
    stars: r.stargazers_count,
  }));

  const targets = repos.filter((r) => !r.fork).slice(0, MAX_REPOS);
  const commitLists = await Promise.all(
    targets.map(async (r) => {
      const data = await gh<GhCommit[]>(
        `/repos/${encodeURIComponent(login)}/${encodeURIComponent(r.name)}/commits?author=${encodeURIComponent(login)}&per_page=30`,
        token
      );
      return (data ?? []).map((c): CommitInfo => {
        const d = c.commit.author ? new Date(c.commit.author.date) : null;
        return {
          message: c.commit.message,
          ref: "", // default-branch history, not a push-to-main signal
          hour: d ? d.getUTCHours() : 12,
          dow: d ? d.getUTCDay() : 3,
          repo: r.name,
        };
      });
    })
  );
  const commits = commitLists.flat().slice(0, MAX_COMMITS);

  const input: RecordInput = {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    bio: user.bio,
    accountType: user.type,
    commits,
    repos: repoInfos,
  };

  const record = buildRecord(input);
  record.deep = true;
  // Scrub the one charge that quotes a real commit-message substring, even on
  // the owner's own live view, so a deep record NEVER renders private commit
  // text anywhere (matches the "no commit text" promise unconditionally).
  record.charges = record.charges.map(safeCharge);
  if (record.sentence.lead) record.sentence.lead = safeCharge(record.sentence.lead);
  // Public-safe stat overrides for when the owner opts to PUBLISH. Live stats
  // stay private-inclusive (shown only to the owner); sanitizeDeepRecord swaps
  // these in before anything is stored/shared.
  record.publicStats = {
    modusOperandi: publicLanguages(repos),
    priorConvictions: user.public_repos,
  };
  return record;
}

// Strip anything that could leak private content before a deep record is
// PUBLISHED (opt-in Most Wanted):
//  - charge details are count-based except "habitual-offender", which echoes a
//    real commit message — replaced.
//  - stats.modusOperandi (top languages) and stats.priorConvictions (repo count)
//    are computed from ALL repos incl. private, so they're replaced with the
//    public-only `publicStats` captured at build time.
// Everything published is then sentence + charge titles/counts + public stats.
type Charge = CrimeRecord["charges"][number];
const SAFE_HABITUAL = "Leaned on the same low-effort commit message far too often.";
function safeCharge(c: Charge): Charge {
  return c.id === "habitual-offender" ? { ...c, detail: SAFE_HABITUAL } : c;
}
export function sanitizeDeepRecord(record: CrimeRecord): CrimeRecord {
  const stats = record.publicStats
    ? {
        ...record.stats,
        modusOperandi: record.publicStats.modusOperandi,
        priorConvictions: record.publicStats.priorConvictions,
      }
    : record.stats;
  const clean: CrimeRecord = {
    ...record,
    stats,
    charges: record.charges.map(safeCharge),
    sentence: {
      ...record.sentence,
      lead: record.sentence.lead ? safeCharge(record.sentence.lead) : record.sentence.lead,
    },
  };
  delete clean.publicStats; // don't persist the override blob
  return clean;
}
