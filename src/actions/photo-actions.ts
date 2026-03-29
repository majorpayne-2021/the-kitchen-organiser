"use server";

import { prisma } from "@/lib/db";
import { deletePhoto } from "@/lib/photos";
import { revalidatePath } from "next/cache";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");

export async function setPhotoPrimary(formData: FormData) {
  const photoId = parseInt(String(formData.get("photoId")), 10);
  if (isNaN(photoId)) throw new Error("Invalid photo id");

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw new Error("Photo not found");

  // Unset all primary photos for this recipe
  await prisma.photo.updateMany({
    where: { recipeId: photo.recipeId },
    data: { isPrimary: false },
  });

  // Set this one as primary
  await prisma.photo.update({
    where: { id: photoId },
    data: { isPrimary: true },
  });

  revalidatePath(`/recipes/${photo.recipeId}`);
}

export async function deletePhotoAction(formData: FormData) {
  const photoId = parseInt(String(formData.get("photoId")), 10);
  if (isNaN(photoId)) throw new Error("Invalid photo id");

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw new Error("Photo not found");

  await deletePhoto(photo.filename, PHOTO_DIR);
  await prisma.photo.delete({ where: { id: photoId } });

  // If this was primary, set another photo as primary
  if (photo.isPrimary) {
    const nextPhoto = await prisma.photo.findFirst({
      where: { recipeId: photo.recipeId },
      orderBy: { createdAt: "asc" },
    });
    if (nextPhoto) {
      await prisma.photo.update({
        where: { id: nextPhoto.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidatePath(`/recipes/${photo.recipeId}`);
}
