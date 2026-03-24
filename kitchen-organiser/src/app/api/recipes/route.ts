import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";

  const recipes = await prisma.recipe.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : undefined,
    select: {
      id: true,
      title: true,
      servings: true,
    },
    take: 20,
    orderBy: { title: "asc" },
  });

  return NextResponse.json(recipes);
}
