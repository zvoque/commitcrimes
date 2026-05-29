// Helpers to pull the signed-in user's GitHub OAuth token (stored by Clerk)
// and resolve their handle. Server-only.
import { clerkClient, currentUser } from "@clerk/nextjs/server";

// The signed-in user's GitHub handle, from their Clerk external account
// (verified at OAuth time — no extra GitHub call). Null if not signed in / no
// GitHub account linked.
export async function getClerkGithubLogin(): Promise<string | null> {
  try {
    const u = await currentUser();
    return u?.externalAccounts?.find((a) => /github/i.test(a.provider))?.username ?? null;
  } catch {
    return null;
  }
}

export async function getGithubToken(userId: string): Promise<string | null> {
  return (await getGithubTokenInfo(userId))?.token ?? null;
}

// Token plus the scopes it carries — lets the Deep flow tell whether the user
// has granted `repo` (private access) yet, for the dual-tier step-up.
export async function getGithubTokenInfo(
  userId: string
): Promise<{ token: string; scopes: string[] } | null> {
  const cc = await clerkClient();
  // Provider id is "github" in Clerk v7 ("oauth_github" historically); try both.
  for (const provider of ["github", "oauth_github"]) {
    try {
      const res = await cc.users.getUserOauthAccessToken(userId, provider as never);
      const t = res.data?.[0];
      if (t?.token) return { token: t.token, scopes: t.scopes ?? [] };
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function getGithubLogin(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "commitcrimes.dev",
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { login: string };
    return u.login;
  } catch {
    return null;
  }
}
