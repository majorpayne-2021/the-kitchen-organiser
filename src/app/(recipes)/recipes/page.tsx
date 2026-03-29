import Link from "next/link";
import { prisma } from "@/lib/db";
import RecipeCard from "@/components/RecipeCard";
import Tag from "@/components/ui/Tag";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  const where: NonNullable<Parameters<typeof prisma.recipe.findMany>[0]>["where"] = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { source: { contains: q } },
      { ingredients: { some: { name: { contains: q } } } },
    ];
  }

  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const [recipes, allTags] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        photos: true,
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-medium">Recipes</h1>
        <Link
          href="/recipes/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-card hover:bg-accent-hover transition-colors"
        >
          + New Recipe
        </Link>
      </div>

      {/* Search */}
      <form method="get" className="mb-6">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <div className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q || ""}
            placeholder="Search recipes..."
            className="flex-1 px-4 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-white font-medium rounded-card hover:bg-accent-hover transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Tag cloud */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/recipes"
            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-tag transition-colors ${
              !tag
                ? "bg-accent text-white"
                : "bg-accent-light text-accent-hover hover:bg-accent hover:text-white"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t.id}
              href={`/recipes?tag=${encodeURIComponent(t.name)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              <Tag
                className={
                  tag === t.name
                    ? "bg-accent text-white"
                    : ""
                }
              >
                {t.name}
              </Tag>
            </Link>
          ))}
        </div>
      )}

      {/* Results info */}
      {(q || tag) && (
        <p className="text-sm text-warm-600 mb-4">
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
          {q ? ` for "${q}"` : ""}
          {tag ? ` tagged "${tag}"` : ""}
        </p>
      )}

      {/* Recipe grid */}
      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-warm-600 text-lg mb-4">No recipes found</p>
          <Link
            href="/recipes/new"
            className="text-accent font-medium hover:text-accent-hover"
          >
            Create your first recipe
          </Link>
        </div>
      )}
    </div>
  );
}
