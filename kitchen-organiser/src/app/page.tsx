import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import RecipeCard from "@/components/RecipeCard";
import Card from "@/components/ui/Card";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  const [recipeCount, mealPlanCount, eventCount, giftCount] = await Promise.all([
    prisma.recipe.count(),
    prisma.mealPlan.count({ where: { planType: "weekly" } }),
    prisma.mealPlan.count({ where: { planType: "event" } }),
    prisma.giftHamper.count(),
  ]);

  const recentRecipes = await prisma.recipe.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      photos: true,
      tags: { include: { tag: true } },
    },
  });

  const greeting = getGreeting();

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-0.5">
        {greeting}, {user?.name || "Chef"}
      </h1>
      <p className="text-warm-600 text-sm mb-8">
        {new Date().toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })}
      </p>

      {/* AI Suggestion Card — Phase 2 placeholder */}
      <div className="bg-gradient-to-br from-warm-100 to-warm-300 border border-warm-300 rounded-[14px] p-6 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-hover mb-1">
          What shall we cook today?
        </p>
        <p className="font-serif text-lg font-semibold mb-3">
          Ask for inspiration based on your recipes and cooking history
        </p>
        <input
          className="w-full px-4 py-3 border border-warm-400 rounded-[10px] bg-white/70 text-sm placeholder:text-warm-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="I'm in the mood for something warm and Italian..."
          disabled
          title="Coming soon — AI suggestions"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { count: recipeCount, label: "Recipes", href: "/recipes" },
          { count: mealPlanCount, label: "Meal Plans", href: "/meal-plans" },
          { count: eventCount, label: "Events", href: "/event-plans" },
          { count: giftCount, label: "Gift Hampers", href: "/gifts" },
        ].map(stat => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-5 hover:shadow-sm transition-shadow">
              <p className="font-serif text-3xl font-semibold text-accent">{stat.count}</p>
              <p className="text-xs text-warm-600 mt-1">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Recipes */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">Recent Recipes</h2>
        <Link href="/recipes" className="text-sm text-accent font-medium hover:text-accent-hover">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentRecipes.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
