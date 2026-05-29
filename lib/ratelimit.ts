// Per-IP rate limiting via Cloudflare's native Rate Limiting binding (atomic,
// unlike KV read-modify-write). No-ops when the binding/context is absent
// (local dev, or before the binding is deployed) so it never blocks dev.
// The @opennextjs/cloudflare import is dynamic so `next dev` (Node) never loads
// the workerd-only module at startup.
interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export async function rateLimited(req: Request): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const rl = (env as Record<string, unknown>).RL as RateLimitBinding | undefined;
    if (!rl?.limit) return false;
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anon";
    const { success } = await rl.limit({ key: ip });
    return !success;
  } catch {
    return false; // fail open — never break a request on limiter trouble
  }
}
