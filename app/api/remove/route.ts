import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGithubToken, getGithubLogin } from "@/lib/clerkGithub";
import { removeRecord } from "@/lib/store";
import { clerkServerEnabled as clerkEnabled } from "@/lib/config";

// Self-serve erasure: the signed-in user removes their OWN record (verified by
// the GitHub identity behind their Clerk session). No one can remove another.
export async function POST() {
  if (!clerkEnabled) {
    return NextResponse.json({ error: "Removal not available; email to request." }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const token = await getGithubToken(userId);
  if (!token) {
    return NextResponse.json({ error: "No GitHub access." }, { status: 400 });
  }
  const login = await getGithubLogin(token);
  if (!login) {
    return NextResponse.json({ error: "Could not resolve GitHub handle." }, { status: 400 });
  }
  const ok = await removeRecord(login);
  if (!ok) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, login });
}
