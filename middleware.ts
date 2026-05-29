import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/ratelimit";
import { clerkServerEnabled as clerkOn } from "@/lib/config";

// Clerk is optional. With no keys, the base is a pass-through so the public app
// works without auth. clerkMiddleware() with no callback just attaches Clerk
// context (no route protection) — only /deep, /me, claim read the session.

const base = clerkOn
  ? clerkMiddleware()
  : (_req: NextRequest, _ev: NextFetchEvent) => NextResponse.next();

// Rate-limit the public lookup surfaces (the scrape / GitHub-bucket targets).
// Not /badge or /api/og — those are fetched by GitHub Camo / social crawlers
// from shared IPs, so per-IP limiting would hit the wrong target.
function shouldLimit(path: string): boolean {
  return path.startsWith("/u/") || path.startsWith("/api/record");
}

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (shouldLimit(req.nextUrl.pathname) && (await rateLimited(req))) {
    return new NextResponse("Slow down — too many requests.", { status: 429 });
  }
  return base(req, ev);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api)(.*)"],
};
