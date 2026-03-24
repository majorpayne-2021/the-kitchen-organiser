"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "kitchen-user-id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const id = parseInt(cookie.value, 10);
  return isNaN(id) ? null : id;
}

export async function setCurrentUserId(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId.toString(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
