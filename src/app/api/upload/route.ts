import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedExtension, processAndSavePhoto } from "@/lib/photos";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");
const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = String(formData.get("type") || "recipe");

  if (!file) {
    return NextResponse.json(
      { error: "Missing file" },
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

  if (type === "avatar") {
    const filename = await processAndSavePhoto(buffer, ext, AVATAR_DIR);
    return NextResponse.json({ filename });
  }

  const filename = await processAndSavePhoto(buffer, ext, PHOTO_DIR);

  if (type === "event") {
    const mealPlanId = parseInt(String(formData.get("mealPlanId")), 10);
    if (isNaN(mealPlanId)) {
      return NextResponse.json(
        { error: "Missing mealPlanId" },
        { status: 400 }
      );
    }

    const photo = await prisma.eventPhoto.create({
      data: { mealPlanId, filename },
    });

    return NextResponse.json({ photo });
  }

  if (type === "gift") {
    const hamperId = parseInt(String(formData.get("hamperId")), 10);
    if (isNaN(hamperId)) {
      return NextResponse.json(
        { error: "Missing hamperId" },
        { status: 400 }
      );
    }

    const photo = await prisma.giftPhoto.create({
      data: { hamperId, filename },
    });

    return NextResponse.json({ photo });
  }

  // Default: recipe photo
  const recipeId = parseInt(String(formData.get("recipeId")), 10);
  if (isNaN(recipeId)) {
    return NextResponse.json(
      { error: "Missing recipeId" },
      { status: 400 }
    );
  }

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
