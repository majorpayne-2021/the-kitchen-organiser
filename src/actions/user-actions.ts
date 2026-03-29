"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateAvatar(userId: number, filename: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { avatarFilename: filename },
  });
  revalidatePath("/profile");
  revalidatePath("/");
}
