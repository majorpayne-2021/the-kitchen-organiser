import { NextRequest, NextResponse } from "next/server";
import { setCurrentUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (typeof userId !== "number") {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  await setCurrentUserId(userId);
  return NextResponse.json({ ok: true });
}
