import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "AI suggestions coming soon! This feature will use Claude to suggest recipes based on your cooking history and preferences.",
    phase: 2,
    ready: false,
  });
}
