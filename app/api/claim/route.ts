import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClerkGithubLogin, getGithubToken } from "@/lib/clerkGithub";
import { getCrimeRecord } from "@/lib/github";
import { claimRecord } from "@/lib/store";
import { clerkServerEnabled as clerkEnabled } from "@/lib/config";

// Claim YOUR OWN record: stores your public record so it powers your badge and
// appears on Most Wanted. You can only claim the GitHub identity behind your
// Clerk session.
export async function POST() {
  if (!clerkEnabled) {
    return NextResponse.json({ error: "Claiming not available." }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const login = await getClerkGithubLogin();
  if (!login) {
    return NextResponse.json({ error: "No GitHub account linked." }, { status: 400 });
  }
  // Compute with the user's own token so the GitHub calls hit their bucket,
  // not the shared server PAT.
  const token = await getGithubToken(userId);
  const record = await getCrimeRecord(login, token ?? undefined);
  if (!record) {
    return NextResponse.json({ error: "No record to claim." }, { status: 404 });
  }
  await claimRecord(record);
  return NextResponse.json({ ok: true, login });
}
