import Link from "next/link";
import { prisma } from "@/lib/db";
import Card from "@/components/ui/Card";

export default async function MealPlansPage() {
  const plans = await prisma.mealPlan.findMany({
    where: { planType: "weekly" },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-medium">Meal Plans</h1>
        <Link
          href="/meal-plans/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-card hover:bg-accent-hover transition-colors"
        >
          + New Plan
        </Link>
      </div>

      {plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/meal-plans/${plan.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <h2 className="font-serif text-lg font-semibold text-warm-800 mb-1">
                  {plan.name}
                </h2>
                <p className="text-sm text-warm-600">
                  {plan.items.length} item{plan.items.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-warm-600 mt-1">
                  Created{" "}
                  {plan.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-warm-600 text-lg mb-4">No meal plans yet</p>
          <Link
            href="/meal-plans/new"
            className="text-accent font-medium hover:text-accent-hover"
          >
            Create your first meal plan
          </Link>
        </div>
      )}
    </div>
  );
}
