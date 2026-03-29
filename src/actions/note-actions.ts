"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addNote(formData: FormData) {
  const recipeId = parseInt(String(formData.get("recipeId")), 10);
  const content = String(formData.get("content") || "").trim();
  if (isNaN(recipeId) || !content) throw new Error("Invalid input");

  await prisma.note.create({
    data: { recipeId, content },
  });

  revalidatePath(`/recipes/${recipeId}`);
}

export async function editNote(formData: FormData) {
  const noteId = parseInt(String(formData.get("noteId")), 10);
  const content = String(formData.get("content") || "").trim();
  if (isNaN(noteId) || !content) throw new Error("Invalid input");

  const note = await prisma.note.update({
    where: { id: noteId },
    data: { content },
  });

  revalidatePath(`/recipes/${note.recipeId}`);
}

export async function deleteNote(formData: FormData) {
  const noteId = parseInt(String(formData.get("noteId")), 10);
  if (isNaN(noteId)) throw new Error("Invalid note id");

  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Note not found");

  await prisma.note.delete({ where: { id: noteId } });

  revalidatePath(`/recipes/${note.recipeId}`);
}
