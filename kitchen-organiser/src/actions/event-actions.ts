"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  // Forward to the upload API
  const uploadData = new FormData();
  uploadData.append("file", file);
  uploadData.append("type", "event");
  uploadData.append("mealPlanId", String(mealPlanId));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: uploadData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Upload failed");
  }

  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function deleteEventPhoto(id: number, mealPlanId: number) {
  await prisma.eventPhoto.delete({ where: { id } });

  revalidatePath(`/event-plans/${mealPlanId}`);
}
