import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { deleteMealPlan, addMealPlanItem, deleteMealPlanItem } from "@/actions/meal-plan-actions";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import MealPlanGrid from "@/components/MealPlanGrid";

const EVENT_CATEGORIES = ["Savoury", "Salads & Sides", "Sweet", "Drinks"];

export default async function MealPlanDetailPage({
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
        include: { recipe: true },
        orderBy: { sortOrder: "asc" },
      },
      dayNotes: true,
    },
  });

  if (!plan) notFound();

  const recipes = await prisma.recipe.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const deleteWithId = deleteMealPlan.bind(null, id);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium">{plan.name}</h1>
          <p className="text-sm text-warm-600 mt-1">
            {plan.planType === "event" ? "Event Plan" : "Weekly Plan"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/meal-plans/${id}/grocery`}>
            <Button variant="secondary" size="sm">
              Grocery List
            </Button>
          </Link>
          <Link href={`/meal-plans/${id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <form action={deleteWithId}>
            <Button type="submit" variant="danger" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </div>

      {/* Grid or event layout */}
      {plan.planType === "weekly" ? (
        <Card className="p-4 overflow-hidden">
          <MealPlanGrid
            mealPlanId={plan.id}
            items={plan.items.map((item) => ({
              id: item.id,
              recipeId: item.recipeId,
              freeText: item.freeText,
              slotLabel: item.slotLabel,
              recipe: item.recipe ? { id: item.recipe.id, title: item.recipe.title } : null,
            }))}
            recipes={recipes}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {EVENT_CATEGORIES.map((category) => {
            const categoryItems = plan.items.filter((item) => item.slotLabel === category);
            return (
              <Card key={category} className="p-4">
                <h2 className="font-serif text-lg font-semibold text-warm-800 mb-3">
                  {category}
                </h2>
                <div className="space-y-2 mb-3">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">
                        {item.recipe ? (
                          <Link
                            href={`/recipes/${item.recipe.id}`}
                            className="text-accent hover:text-accent-hover"
                          >
                            {item.recipe.title}
                          </Link>
                        ) : (
                          <span className="text-warm-800">{item.freeText}</span>
                        )}
                      </span>
                      <form action={async () => {
                        "use server";
                        await deleteMealPlanItem(item.id, plan.id);
                      }}>
                        <button type="submit" className="text-red-400 hover:text-red-600 text-xs">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))}
                  {categoryItems.length === 0 && (
                    <p className="text-sm text-warm-600 italic">No items yet</p>
                  )}
                </div>
                {/* Add form */}
                <form action={addMealPlanItem} className="flex gap-2 items-end">
                  <input type="hidden" name="mealPlanId" value={plan.id} />
                  <input type="hidden" name="slotLabel" value={category} />
                  <select
                    name="recipeId"
                    className="flex-1 text-sm px-2 py-1.5 border border-warm-200 rounded-card bg-white text-warm-800"
                  >
                    <option value="">-- Free text --</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <input
                    name="freeText"
                    type="text"
                    placeholder="Or type item..."
                    className="flex-1 text-sm px-2 py-1.5 border border-warm-200 rounded-card bg-white text-warm-800 placeholder:text-warm-600"
                  />
                  <Button type="submit" size="sm">
                    Add
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
