import Link from "next/link";
import Image from "next/image";
import type { RecipeCard as RecipeCardType } from "@/types";
import Tag from "@/components/ui/Tag";

interface RecipeCardProps {
  recipe: RecipeCardType;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const thumbnail = recipe.photos.find(p => p.isPrimary) ?? recipe.photos[0];
  const displayTags = recipe.tags.slice(0, 3);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group block bg-white rounded-card border border-warm-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative w-full aspect-[4/3] bg-warm-100 overflow-hidden">
        {thumbnail ? (
          <Image
            src={`/photos/thumb_${thumbnail.filename}`}
            alt={recipe.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center">
            <span className="text-4xl opacity-40">🍳</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayTags.map(({ tag }) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-serif text-lg font-semibold text-warm-800 leading-snug line-clamp-2">
          {recipe.title}
        </h3>

        {/* Description */}
        {recipe.description && (
          <p className="text-sm text-warm-600 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-warm-600 mt-1">
          {recipe.prepTime != null && recipe.prepTime > 0 && (
            <span title="Prep time">⏱ {recipe.prepTime}m prep</span>
          )}
          {recipe.cookTime != null && recipe.cookTime > 0 && (
            <span title="Cook time">🔥 {recipe.cookTime}m cook</span>
          )}
          {recipe.servings != null && recipe.servings > 0 && (
            <span title="Servings">👥 {recipe.servings}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
