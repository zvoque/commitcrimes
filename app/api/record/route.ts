import { NextRequest, NextResponse } from "next/server";
import { getCrimeRecord, isValidUsername, RateLimitError } from "@/lib/github";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u")?.trim() ?? "";
  if (!u || !isValidUsername(u)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  try {
    const record = await getCrimeRecord(u);
    if (!record) {
      return NextResponse.json({ error: "No record found" }, { status: 404 });
    }
    return NextResponse.json(record, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: "The department is overwhelmed. Try again shortly." }, { status: 429 });
    }
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
