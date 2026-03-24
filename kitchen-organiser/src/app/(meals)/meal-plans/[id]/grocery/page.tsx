import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { aggregateGroceryList } from "@/lib/grocery";
import GroceryListComponent from "@/components/GroceryList";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default async function GroceryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          recipe: {
            include: { ingredients: true },
          },
        },
      },
    },
  });

  if (!plan) notFound();

  // Build grocery inputs from all recipe items
  const groceryInputs = plan.items.flatMap((item) => {
    if (!item.recipe) return [];
    const recipeServings = item.recipe.servings || 1;
    const overrideServings = item.servingsOverride || recipeServings;
    const ratio = overrideServings / recipeServings;

    return item.recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      groceryCategory: ing.groceryCategory,
      servingsRatio: ratio,
    }));
  });

  const groceryList = aggregateGroceryList(groceryInputs);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium">Grocery List</h1>
          <p className="text-sm text-warm-600 mt-1">{plan.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/meal-plans/${id}`}>
            <Button variant="secondary" size="sm">
              Back to Plan
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={undefined}
            className="print:hidden"
          >
            Print
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <GroceryListComponent groceryList={groceryList} />
      </Card>
    </div>
  );
}
