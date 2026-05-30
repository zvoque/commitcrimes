// GitHub data fetching + normalization. Server-only.
import type { CommitInfo, CrimeRecord, RecordInput, RepoInfo } from "./types";
import { buildRecord } from "./charges";
import { isRemoved, getCachedRecord, cacheRecord } from "./store";
import { isValidUsername } from "./username";
export { isValidUsername } from "./username";

const API = "https://api.github.com";
const DAY_MS = 24 * 60 * 60 * 1000;

export class RateLimitError extends Error {
  constructor() {
    super("GitHub rate limit exceeded");
    this.name = "RateLimitError";
  }
}

// `token` overrides the server PAT — used for claim/deep so the request counts
// against the signed-in user's own 5000/hr instead of the shared server bucket.
function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "commitcrimes.dev",
  };
  const t = token ?? process.env.GITHUB_TOKEN;
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
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
  stargazers_count: number;
}

interface GhEvent {
  type: string;
  created_at: string;
  repo?: { name: string };
  payload?: { ref?: string; commits?: { message: string }[] };
}

interface GhCommit {
  commit: { message: string; author: { date: string } | null };
}

async function ghFetch<T>(path: string, token?: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(token),
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) throw new RateLimitError();
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return (await res.json()) as T;
}

// Default-branch commit history for one repo. Fattens thin records when the
// public events feed is sparse. Message + timestamp only; ref blank so these
// never count as "push to main".
async function fetchRepoCommits(login: string, repo: string, token?: string): Promise<CommitInfo[]> {
  try {
    const u = encodeURIComponent(login);
    const res = await fetch(`${API}/repos/${u}/${encodeURIComponent(repo)}/commits?author=${u}&per_page=30`, {
      headers: headers(token),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GhCommit[];
    return data.map((c) => {
      const d = c.commit.author ? new Date(c.commit.author.date) : null;
      return {
        message: c.commit.message,
        ref: "",
        hour: d ? d.getUTCHours() : 12,
        dow: d ? d.getUTCDay() : 3,
        repo,
      };
    });
  } catch {
    return [];
  }
}

const MAX_COMMITS = 300;

// Read-through cache: a record cached within 24h is returned without hitting
// GitHub. This decouples GitHub load from traffic (each handle costs GitHub at
// most once/24h regardless of how many people view it). `token`, when passed,
// counts the GitHub calls against that user instead of the server bucket.
export async function getCrimeRecord(
  login: string,
  token?: string,
  opts?: { publicOnly?: boolean }
): Promise<CrimeRecord | null> {
  if (!isValidUsername(login)) return null;

  // Honor opt-out: removed logins are treated as no record (never re-cached).
  if (await isRemoved(login)) return null;

  const cached = await getCachedRecord(login);
  // publicOnly bypasses the sticky-deep + TTL cache to recompute the TRUE public
  // record — used by /deep so the public-vs-private delta is honest (a published
  // deep user's "public" record must not be their own deep record).
  if (!opts?.publicOnly) {
    // A published deep record is sticky: serve it as-is, never overwrite with
    // recomputed public data. The owner refreshes it by re-publishing from /deep.
    if (cached?.record.deep) return cached.record;
    if (cached && Date.now() - cached.updatedAt.getTime() < DAY_MS) {
      return cached.record;
    }
  }

  const enc = encodeURIComponent(login); // defense-in-depth (login is already validated)
  try {
    const user = await ghFetch<GhUser>(`/users/${enc}`, token);
    if (!user) return null;

  const [repos, events] = await Promise.all([
    ghFetch<GhRepo[]>(`/users/${enc}/repos?per_page=100&sort=pushed`, token),
    ghFetch<GhEvent[]>(`/users/${enc}/events/public?per_page=100`, token),
  ]);

  const repoInfos: RepoInfo[] = (repos ?? []).map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    pushedAt: r.pushed_at,
    fork: r.fork,
    stars: r.stargazers_count,
  }));

  const commits: CommitInfo[] = [];
  for (const ev of events ?? []) {
    if (ev.type !== "PushEvent" || !ev.payload?.commits) continue;
    const when = new Date(ev.created_at);
    const hour = when.getUTCHours();
    const dow = when.getUTCDay();
    const ref = ev.payload.ref ?? "";
    const repo = ev.repo?.name ?? "";
    for (const c of ev.payload.commits) {
      commits.push({ message: c.message, ref, hour, dow, repo });
      if (commits.length >= MAX_COMMITS) break;
    }
    if (commits.length >= MAX_COMMITS) break;
  }

  // Fatten thin records from the most recently pushed public repos.
  if (commits.length < 25) {
    const targets = repoInfos.filter((r) => !r.fork).slice(0, 5);
    const extra = await Promise.all(targets.map((r) => fetchRepoCommits(user.login, r.name, token)));
    for (const list of extra) {
      for (const c of list) {
        if (commits.length >= MAX_COMMITS) break;
        commits.push(c);
      }
      if (commits.length >= MAX_COMMITS) break;
    }
  }

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
    await cacheRecord(record); // store-all read-through cache (preserves claimed)
    return record;
  } catch (err) {
    // GitHub down or rate-limited: serve stale cache if we have any. Not for
    // publicOnly (would hand back a sticky-deep record mislabeled as public).
    if (cached && !opts?.publicOnly) return cached.record;
    throw err;
  }
}
