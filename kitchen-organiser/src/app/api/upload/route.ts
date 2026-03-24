import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedExtension, processAndSavePhoto } from "@/lib/photos";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const recipeId = parseInt(String(formData.get("recipeId")), 10);

  if (!file || isNaN(recipeId)) {
    return NextResponse.json(
      { error: "Missing file or recipeId" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "";
  if (!isAllowedExtension(ext)) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = await processAndSavePhoto(buffer, ext, PHOTO_DIR);

  // Check if this is the first photo for the recipe
  const existingCount = await prisma.photo.count({
    where: { recipeId },
  });

  const photo = await prisma.photo.create({
    data: {
      recipeId,
      filename,
      isPrimary: existingCount === 0,
    },
  });

  return NextResponse.json({ photo });
}
