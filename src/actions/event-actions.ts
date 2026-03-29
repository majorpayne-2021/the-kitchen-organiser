"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { deletePhoto, isAllowedExtension, processAndSavePhoto } from "@/lib/photos";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");

export async function addInvitee(formData: FormData) {
  const mealPlanId = parseInt(String(formData.get("mealPlanId")), 10);
  const name = String(formData.get("name") || "").trim();

  if (isNaN(mealPlanId) || !name) throw new Error("Missing required fields");

  await prisma.eventInvitee.create({
    data: { mealPlanId, name },
  });

  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function updateInvitee(formData: FormData) {
  const inviteeId = parseInt(String(formData.get("inviteeId")), 10);
  const rsvp = String(formData.get("rsvp") || "pending").trim();
  const dietary = String(formData.get("dietary") || "").trim() || null;

  if (isNaN(inviteeId)) throw new Error("Invalid invitee id");

  const invitee = await prisma.eventInvitee.update({
    where: { id: inviteeId },
    data: { rsvp, dietary },
  });

  revalidatePath(`/event-plans/${invitee.mealPlanId}`);
}

export async function deleteInvitee(id: number, mealPlanId: number) {
  await prisma.eventInvitee.delete({ where: { id } });

  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function addEventNote(formData: FormData) {
  const mealPlanId = parseInt(String(formData.get("mealPlanId")), 10);
  const content = String(formData.get("content") || "").trim();

  if (isNaN(mealPlanId) || !content) throw new Error("Missing required fields");

  await prisma.eventNote.create({
    data: { mealPlanId, content },
  });

  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function deleteEventNote(id: number, mealPlanId: number) {
  await prisma.eventNote.delete({ where: { id } });

  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function uploadEventPhoto(formData: FormData) {
  const mealPlanId = parseInt(String(formData.get("mealPlanId")), 10);
  if (isNaN(mealPlanId)) throw new Error("Invalid meal plan id");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const ext = file.name.split(".").pop() || "";
  if (!isAllowedExtension(ext)) throw new Error("File type not allowed");

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = await processAndSavePhoto(buffer, ext, PHOTO_DIR);

  await prisma.eventPhoto.create({
    data: { mealPlanId, filename },
  });

  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function deleteEventPhoto(id: number, mealPlanId: number) {
  const photo = await prisma.eventPhoto.findUnique({ where: { id } });
  if (photo) {
    await deletePhoto(photo.filename, PHOTO_DIR);
  }
  await prisma.eventPhoto.delete({ where: { id } });

  revalidatePath(`/event-plans/${mealPlanId}`);
}
