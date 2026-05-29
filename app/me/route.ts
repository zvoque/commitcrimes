import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClerkGithubLogin } from "@/lib/clerkGithub";
import { clerkServerEnabled as clerkEnabled } from "@/lib/config";

// After signing in, send the user straight to their own record (no typing).
export async function GET(req: NextRequest) {
  if (!clerkEnabled) return NextResponse.redirect(new URL("/", req.url));
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/", req.url));
  const login = await getClerkGithubLogin();
  return NextResponse.redirect(new URL(login ? `/u/${login}` : "/", req.url));
}
