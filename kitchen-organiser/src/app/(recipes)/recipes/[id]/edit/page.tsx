import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import RecipeForm from "@/components/RecipeForm";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recipe) notFound();

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-6">Edit Recipe</h1>
      <div className="max-w-2xl">
        <RecipeForm recipe={recipe} />
      </div>
    </div>
  );
}
