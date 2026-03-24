import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const data = await scrapeUrl(url, PHOTO_DIR);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scraping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
