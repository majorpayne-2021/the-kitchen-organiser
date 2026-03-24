"use server";

import { prisma } from "@/lib/db";
import { parseIngredient, guessCategory } from "@/lib/ingredients";
import { deletePhoto } from "@/lib/photos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";

const PHOTO_DIR = path.join(process.cwd(), "public", "photos");

function parseSteps(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return JSON.stringify(lines);
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function toIntOrNull(val: FormDataEntryValue | null): number | null {
  if (!val || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

export async function createRecipe(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const prepTime = toIntOrNull(formData.get("prepTime"));
  const cookTime = toIntOrNull(formData.get("cookTime"));
  const servings = toIntOrNull(formData.get("servings"));
  const source = String(formData.get("source") || "").trim() || null;
  const stepsRaw = String(formData.get("steps") || "");
  const ingredientsRaw = String(formData.get("ingredients") || "");
  const tagsRaw = String(formData.get("tags") || "");

  const steps = parseSteps(stepsRaw);
  const tagNames = parseTags(tagsRaw);

  const ingredientLines = ingredientsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const recipe = await prisma.recipe.create({
    data: {
      title,
      description,
      prepTime,
      cookTime,
      servings,
      source,
      steps,
    },
  });

  // Create ingredients
  for (let i = 0; i < ingredientLines.length; i++) {
    const parsed = parseIngredient(ingredientLines[i]);
    await prisma.ingredient.create({
      data: {
        recipeId: recipe.id,
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        groceryCategory: guessCategory(parsed.name),
        sortOrder: i,
      },
    });
  }

  // Upsert tags and create junction records
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.recipeTag.create({
      data: { recipeId: recipe.id, tagId: tag.id },
    });
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(formData: FormData) {
  const id = parseInt(String(formData.get("id")), 10);
  if (isNaN(id)) throw new Error("Invalid recipe id");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const prepTime = toIntOrNull(formData.get("prepTime"));
  const cookTime = toIntOrNull(formData.get("cookTime"));
  const servings = toIntOrNull(formData.get("servings"));
  const source = String(formData.get("source") || "").trim() || null;
  const stepsRaw = String(formData.get("steps") || "");
  const ingredientsRaw = String(formData.get("ingredients") || "");
  const tagsRaw = String(formData.get("tags") || "");

  const steps = parseSteps(stepsRaw);
  const tagNames = parseTags(tagsRaw);

  const ingredientLines = ingredientsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  await prisma.recipe.update({
    where: { id },
    data: {
      title,
      description,
      prepTime,
      cookTime,
      servings,
      source,
      steps,
    },
  });

  // Delete existing ingredients and tags, recreate
  await prisma.ingredient.deleteMany({ where: { recipeId: id } });
  await prisma.recipeTag.deleteMany({ where: { recipeId: id } });

  for (let i = 0; i < ingredientLines.length; i++) {
    const parsed = parseIngredient(ingredientLines[i]);
    await prisma.ingredient.create({
      data: {
        recipeId: id,
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        groceryCategory: guessCategory(parsed.name),
        sortOrder: i,
      },
    });
  }

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.recipeTag.create({
      data: { recipeId: id, tagId: tag.id },
    });
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(formData: FormData) {
  const id = parseInt(String(formData.get("id")), 10);
  if (isNaN(id)) throw new Error("Invalid recipe id");

  // Delete associated photo files from disk
  const photos = await prisma.photo.findMany({ where: { recipeId: id } });
  for (const photo of photos) {
    await deletePhoto(photo.filename, PHOTO_DIR);
  }

  await prisma.recipe.delete({ where: { id } });

  revalidatePath("/recipes");
  redirect("/recipes");
}
