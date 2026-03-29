import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { deleteRecipe } from "@/actions/recipe-actions";
import { addNote, deleteNote } from "@/actions/note-actions";
import Tag from "@/components/ui/Tag";
import Button from "@/components/ui/Button";
import PhotoGallery from "@/components/PhotoGallery";
import PhotoUpload from "@/components/PhotoUpload";

export default async function RecipeDetailPage({
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
      photos: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recipe) notFound();

  const primaryPhoto = recipe.photos.find((p) => p.isPrimary) || recipe.photos[0];
  const steps: string[] = recipe.steps ? (() => {
    try {
      const parsed = JSON.parse(recipe.steps);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })() : [];

  return (
    <div>
      {/* Hero section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Photo */}
        <div className="md:w-1/2">
          <div className="relative aspect-[4/3] rounded-card overflow-hidden bg-warm-100">
            {primaryPhoto ? (
              <Image
                src={`/photos/${primaryPhoto.filename}`}
                alt={recipe.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center">
                <span className="text-6xl opacity-40">🍳</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="md:w-1/2 flex flex-col justify-center">
          <h1 className="font-serif text-3xl font-semibold text-warm-800 mb-3">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-warm-600 leading-relaxed mb-4">
              {recipe.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-warm-600 mb-4">
            {recipe.prepTime != null && recipe.prepTime > 0 && (
              <span>Prep: {recipe.prepTime} min</span>
            )}
            {recipe.cookTime != null && recipe.cookTime > 0 && (
              <span>Cook: {recipe.cookTime} min</span>
            )}
            {recipe.servings != null && recipe.servings > 0 && (
              <span>Servings: {recipe.servings}</span>
            )}
          </div>

          {recipe.source && (
            <a
              href={recipe.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:text-accent-hover mb-4 inline-block"
            >
              View source
            </a>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.tags.map(({ tag }) => (
                <Link key={tag.id} href={`/recipes?tag=${encodeURIComponent(tag.name)}`}>
                  <Tag>{tag.name}</Tag>
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <Link href={`/recipes/${recipe.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
            <form action={deleteRecipe}>
              <input type="hidden" name="id" value={recipe.id} />
              <Button
                type="submit"
                variant="danger"
                size="sm"
              >
                Delete
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Two-column layout: Ingredients + Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <div className="md:col-span-1">
            <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex gap-2 text-warm-800">
                  <span className="text-accent font-medium whitespace-nowrap">
                    {ing.quantity != null ? ing.quantity : ""}
                    {ing.unit ? ` ${ing.unit}` : ""}
                  </span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="md:col-span-2">
            <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">
              Instructions
            </h2>
            <ol className="space-y-4">
              {steps.map((step, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-warm-100 text-accent rounded-full flex items-center justify-center font-semibold text-sm">
                    {idx + 1}
                  </span>
                  <p className="text-warm-800 leading-relaxed pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Photo Gallery */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-warm-800">
            Photos
          </h2>
          <PhotoUpload recipeId={recipe.id} />
        </div>
        <PhotoGallery photos={recipe.photos} />
      </section>

      {/* Notes section */}
      <section className="mb-10">
        <h2 className="font-serif text-xl font-semibold text-warm-800 mb-4">
          Notes
        </h2>

        {/* Existing notes */}
        {recipe.notes.length > 0 && (
          <div className="space-y-3 mb-6">
            {recipe.notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-card border border-warm-200 p-4"
              >
                <p className="text-warm-800 mb-2">{note.content}</p>
                <div className="flex items-center gap-3 text-xs text-warm-600">
                  <span>
                    {note.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <form action={deleteNote} className="inline">
                    <input type="hidden" name="noteId" value={note.id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add note form */}
        <form action={addNote} className="flex gap-2">
          <input type="hidden" name="recipeId" value={recipe.id} />
          <input
            name="content"
            type="text"
            placeholder="Add a note..."
            required
            className="flex-1 px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
          />
          <Button type="submit" size="sm">
            Add Note
          </Button>
        </form>
      </section>
    </div>
  );
}
