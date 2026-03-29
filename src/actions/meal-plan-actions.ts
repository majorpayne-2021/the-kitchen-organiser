"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMealPlan(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const planType = String(formData.get("planType") || "weekly").trim();
  const eventDate = String(formData.get("eventDate") || "").trim() || null;
  const eventTime = String(formData.get("eventTime") || "").trim() || null;

  if (!name) throw new Error("Name is required");

  const plan = await prisma.mealPlan.create({
    data: { name, planType, eventDate, eventTime },
  });

  revalidatePath("/meal-plans");
  revalidatePath("/event-plans");
  redirect(planType === "event" ? `/event-plans/${plan.id}` : `/meal-plans/${plan.id}`);
}

export async function updateMealPlan(id: number, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const planType = String(formData.get("planType") || "weekly").trim();
  const eventDate = String(formData.get("eventDate") || "").trim() || null;
  const eventTime = String(formData.get("eventTime") || "").trim() || null;

  if (!name) throw new Error("Name is required");

  await prisma.mealPlan.update({
    where: { id },
    data: { name, planType, eventDate, eventTime },
  });

  revalidatePath("/meal-plans");
  revalidatePath("/event-plans");
  revalidatePath(`/meal-plans/${id}`);
  revalidatePath(`/event-plans/${id}`);
  redirect(planType === "event" ? `/event-plans/${id}` : `/meal-plans/${id}`);
}

export async function deleteMealPlan(id: number) {
  const plan = await prisma.mealPlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Plan not found");

  await prisma.mealPlan.delete({ where: { id } });

  revalidatePath("/meal-plans");
  revalidatePath("/event-plans");
  redirect(plan.planType === "event" ? "/event-plans" : "/meal-plans");
}

export async function addMealPlanItem(formData: FormData) {
  const mealPlanId = parseInt(String(formData.get("mealPlanId")), 10);
  const recipeIdRaw = String(formData.get("recipeId") || "").trim();
  const freeText = String(formData.get("freeText") || "").trim() || null;
  const slotLabel = String(formData.get("slotLabel") || "").trim();
  const servingsOverride =
    parseInt(String(formData.get("servingsOverride") || ""), 10) || null;

  if (isNaN(mealPlanId) || !slotLabel) throw new Error("Missing required fields");

  const recipeId = recipeIdRaw ? parseInt(recipeIdRaw, 10) : null;
  if (!recipeId && !freeText) throw new Error("Must provide recipe or free text");

  await prisma.mealPlanItem.create({
    data: {
      mealPlanId,
      recipeId: recipeId && !isNaN(recipeId) ? recipeId : null,
      freeText,
      slotLabel,
      servingsOverride,
    },
  });

  revalidatePath(`/meal-plans/${mealPlanId}`);
  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function deleteMealPlanItem(id: number, mealPlanId: number) {
  await prisma.mealPlanItem.delete({ where: { id } });

  revalidatePath(`/meal-plans/${mealPlanId}`);
  revalidatePath(`/event-plans/${mealPlanId}`);
}

export async function saveDayNote(formData: FormData) {
  const mealPlanId = parseInt(String(formData.get("mealPlanId")), 10);
  const day = String(formData.get("day") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (isNaN(mealPlanId) || !day) throw new Error("Missing required fields");

  // Find existing note for this day
  const existing = await prisma.mealPlanDayNote.findFirst({
    where: { mealPlanId, day },
  });

  if (existing) {
    if (content) {
      await prisma.mealPlanDayNote.update({
        where: { id: existing.id },
        data: { content },
      });
    } else {
      await prisma.mealPlanDayNote.delete({ where: { id: existing.id } });
    }
  } else if (content) {
    await prisma.mealPlanDayNote.create({
      data: { mealPlanId, day, content },
    });
  }

  revalidatePath(`/meal-plans/${mealPlanId}`);
}
