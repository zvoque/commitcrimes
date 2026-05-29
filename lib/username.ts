// GitHub username validation. Pure + client-safe (kept out of lib/github.ts,
// which is server-only). GitHub handles: 1-39 chars, alphanumeric or single
// hyphens, no leading/trailing hyphen.
export const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidUsername(login: string): boolean {
  return USERNAME_RE.test(login);
}
