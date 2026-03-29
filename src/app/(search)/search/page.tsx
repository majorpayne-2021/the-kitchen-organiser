import Link from "next/link";
import { searchByIngredients } from "@/lib/ingredients";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ ingredients?: string }>;
}) {
  const { ingredients } = await searchParams;

  const ingredientList = ingredients
    ? ingredients
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  const results = ingredientList.length > 0 ? await searchByIngredients(ingredientList) : [];

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-2">What Can I Make?</h1>
      <p className="text-warm-600 mb-6">
        Enter the ingredients you have on hand and find matching recipes.
      </p>

      {/* Search form */}
      <Card className="p-4 mb-6">
        <form method="get" className="space-y-3">
          <textarea
            name="ingredients"
            placeholder="Enter ingredients, one per line...&#10;e.g.&#10;chicken&#10;rice&#10;garlic"
            rows={5}
            defaultValue={ingredients || ""}
            className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-y"
          />
          <Button type="submit">Search Recipes</Button>
        </form>
      </Card>

      {/* Results */}
      {ingredientList.length > 0 && (
        <div>
          <p className="text-sm text-warm-600 mb-4">
            Found {results.length} recipe{results.length !== 1 ? "s" : ""} matching your
            ingredients
          </p>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result) => (
                <Card key={result.recipe.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/recipes/${result.recipe.id}`}
                        className="font-serif text-lg font-semibold text-accent hover:text-accent-hover"
                      >
                        {result.recipe.title}
                      </Link>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {result.matched.map((ing) => (
                          <span
                            key={ing}
                            className="inline-flex items-center px-2 py-0.5 text-xs rounded-tag bg-green-100 text-green-800"
                          >
                            {ing}
                          </span>
                        ))}
                        {result.missing.map((ing) => (
                          <span
                            key={ing}
                            className="inline-flex items-center px-2 py-0.5 text-xs rounded-tag bg-warm-100 text-warm-600"
                          >
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <span
                        className={`text-2xl font-bold ${
                          result.matchPct >= 75
                            ? "text-green-600"
                            : result.matchPct >= 50
                              ? "text-yellow-600"
                              : "text-warm-600"
                        }`}
                      >
                        {result.matchPct}%
                      </span>
                      <p className="text-xs text-warm-600">match</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-warm-600 text-lg">
                No recipes match your ingredients. Try adding more!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
