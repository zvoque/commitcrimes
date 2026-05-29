import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGithubTokenInfo } from "@/lib/clerkGithub";
import { getDeepRecordForToken, sanitizeDeepRecord } from "@/lib/deep";
import { publishDeepRecord } from "@/lib/store";
import { clerkServerEnabled as clerkEnabled } from "@/lib/config";

// Opt in to rank your OWN deep record (private repos included) on Most Wanted.
// Default off — nothing is stored until you call this. We publish only your
// sentence, charge titles, and counts (sanitized); never repo names or commit
// text. You can erase it anytime via /remove.
export async function POST() {
  if (!clerkEnabled) {
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const info = await getGithubTokenInfo(userId);
  if (!info) {
    return NextResponse.json({ error: "No GitHub account linked." }, { status: 400 });
  }
  if (!info.scopes.includes("repo")) {
    return NextResponse.json(
      { error: "Grant private repo access first." },
      { status: 400 }
    );
  }
  const record = await getDeepRecordForToken(info.token);
  if (!record) {
    return NextResponse.json({ error: "Couldn't build your record." }, { status: 404 });
  }
  await publishDeepRecord(sanitizeDeepRecord(record));
  return NextResponse.json({ ok: true, login: record.login });
}
