"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deletePhoto, isAllowedExtension, processAndSavePhoto } from "@/lib/photos";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");

export async function createGiftHamper(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const giftDate = String(formData.get("giftDate") || "").trim() || null;

  if (!title) throw new Error("Title is required");

  const hamper = await prisma.giftHamper.create({
    data: { title, giftDate },
  });

  revalidatePath("/gifts");
  redirect(`/gifts/${hamper.id}`);
}

export async function deleteGiftHamper(id: number) {
  await prisma.giftHamper.delete({ where: { id } });

  revalidatePath("/gifts");
  redirect("/gifts");
}

export async function addGiftItem(formData: FormData) {
  const hamperId = parseInt(String(formData.get("hamperId")), 10);
  const description = String(formData.get("description") || "").trim();

  if (isNaN(hamperId) || !description) throw new Error("Missing required fields");

  await prisma.giftHamperItem.create({
    data: { hamperId, description },
  });

  revalidatePath(`/gifts/${hamperId}`);
}

export async function toggleGiftItem(id: number, hamperId: number) {
  const item = await prisma.giftHamperItem.findUnique({ where: { id } });
  if (!item) throw new Error("Item not found");

  await prisma.giftHamperItem.update({
    where: { id },
    data: { checked: !item.checked },
  });

  revalidatePath(`/gifts/${hamperId}`);
}

export async function addGiftItemNote(formData: FormData) {
  const itemId = parseInt(String(formData.get("itemId")), 10);
  const note = String(formData.get("note") || "").trim() || null;
  const hamperId = parseInt(String(formData.get("hamperId")), 10);

  if (isNaN(itemId)) throw new Error("Invalid item id");

  await prisma.giftHamperItem.update({
    where: { id: itemId },
    data: { note },
  });

  revalidatePath(`/gifts/${hamperId}`);
}

export async function deleteGiftItem(id: number, hamperId: number) {
  await prisma.giftHamperItem.delete({ where: { id } });

  revalidatePath(`/gifts/${hamperId}`);
}

export async function updateGiftDate(formData: FormData) {
  const hamperId = parseInt(String(formData.get("hamperId")), 10);
  const giftDate = String(formData.get("giftDate") || "").trim() || null;

  if (isNaN(hamperId)) throw new Error("Invalid hamper id");

  await prisma.giftHamper.update({
    where: { id: hamperId },
    data: { giftDate },
  });

  revalidatePath(`/gifts/${hamperId}`);
  revalidatePath("/gifts");
}

export async function uploadGiftPhoto(formData: FormData) {
  const hamperId = parseInt(String(formData.get("hamperId")), 10);
  if (isNaN(hamperId)) throw new Error("Invalid hamper id");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const ext = file.name.split(".").pop() || "";
  if (!isAllowedExtension(ext)) throw new Error("File type not allowed");

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = await processAndSavePhoto(buffer, ext, PHOTO_DIR);

  await prisma.giftPhoto.create({
    data: { hamperId, filename },
  });

  revalidatePath(`/gifts/${hamperId}`);
}

export async function deleteGiftPhoto(id: number, hamperId: number) {
  const photo = await prisma.giftPhoto.findUnique({ where: { id } });
  if (photo) {
    await deletePhoto(photo.filename, PHOTO_DIR);
  }
  await prisma.giftPhoto.delete({ where: { id } });

  revalidatePath(`/gifts/${hamperId}`);
}
