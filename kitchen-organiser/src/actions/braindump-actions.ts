"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addBraindump(formData: FormData) {
  const content = String(formData.get("content") || "").trim();

  if (!content) throw new Error("Content is required");

  await prisma.braindump.create({
    data: { content },
  });

  revalidatePath("/braindump");
}

export async function deleteBraindump(id: number) {
  await prisma.braindump.delete({ where: { id } });

  revalidatePath("/braindump");
}
