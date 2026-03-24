"use client";

import React, { useState } from "react";
import { createRecipe, updateRecipe } from "@/actions/recipe-actions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface RecipeFormProps {
  recipe?: {
    id: number;
    title: string;
    description: string | null;
    prepTime: number | null;
    cookTime: number | null;
    servings: number | null;
    source: string | null;
    steps: string | null;
    ingredients: { quantity: number | null; unit: string | null; name: string }[];
    tags: { tag: { name: string } }[];
  };
}

function formatIngredientLine(ing: {
  quantity: number | null;
  unit: string | null;
  name: string;
}): string {
  const parts: string[] = [];
  if (ing.quantity != null) parts.push(String(ing.quantity));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(" ");
}

function stepsToText(stepsJson: string | null): string {
  if (!stepsJson) return "";
  try {
    const arr = JSON.parse(stepsJson);
    if (Array.isArray(arr)) return arr.join("\n");
  } catch {
    // ignore
  }
  return stepsJson;
}

export default function RecipeForm({ recipe }: RecipeFormProps) {
  const isEdit = !!recipe;

  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const [title, setTitle] = useState(recipe?.title || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() || "");
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() || "");
  const [servings, setServings] = useState(recipe?.servings?.toString() || "");
  const [source, setSource] = useState(recipe?.source || "");
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients.map(formatIngredientLine).join("\n") || ""
  );
  const [steps, setSteps] = useState(stepsToText(recipe?.steps ?? null));
  const [tags, setTags] = useState(
    recipe?.tags.map((t) => t.tag.name).join(", ") || ""
  );

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }
      const data = await res.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
      setPrepTime(data.prepTime != null ? String(data.prepTime) : "");
      setCookTime(data.cookTime != null ? String(data.cookTime) : "");
      setServings(data.servings != null ? String(data.servings) : "");
      setSource(data.source || importUrl);
      if (data.ingredients?.length) {
        setIngredients(data.ingredients.join("\n"));
      }
      if (data.steps?.length) {
        setSteps(data.steps.join("\n"));
      }
      if (data.tags?.length) {
        setTags(data.tags.join(", "));
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const action = isEdit ? updateRecipe : createRecipe;

  return (
    <form action={action} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={recipe.id} />}

      {/* Import from URL */}
      {!isEdit && (
        <div className="bg-warm-100 rounded-card p-4 border border-warm-200">
          <label className="text-sm font-medium text-warm-800 block mb-2">
            Import from URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com/recipe..."
              className="flex-1 px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
          {importError && (
            <p className="text-sm text-red-600 mt-2">{importError}</p>
          )}
        </div>
      )}

      {/* Title */}
      <Input
        label="Title"
        name="title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Recipe title"
      />

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="description"
          className="text-sm font-medium text-warm-800"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description..."
          className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      {/* Time & Servings row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Prep Time (min)"
          name="prepTime"
          type="number"
          min="0"
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
        />
        <Input
          label="Cook Time (min)"
          name="cookTime"
          type="number"
          min="0"
          value={cookTime}
          onChange={(e) => setCookTime(e.target.value)}
        />
        <Input
          label="Servings"
          name="servings"
          type="number"
          min="1"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
      </div>

      {/* Source */}
      <Input
        label="Source URL"
        name="source"
        type="url"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="https://..."
      />

      {/* Ingredients */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="ingredients"
          className="text-sm font-medium text-warm-800"
        >
          Ingredients (one per line)
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          rows={8}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder={"2 cups flour\n1 tsp salt\n3 eggs"}
          className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-mono text-sm"
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1">
        <label htmlFor="steps" className="text-sm font-medium text-warm-800">
          Steps (one per line)
        </label>
        <textarea
          id="steps"
          name="steps"
          rows={8}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder={"Preheat oven to 350F\nMix dry ingredients\nAdd wet ingredients"}
          className="w-full px-3 py-2 rounded-card border border-warm-200 bg-white text-warm-800 placeholder:text-warm-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-mono text-sm"
        />
      </div>

      {/* Tags */}
      <Input
        label="Tags (comma-separated)"
        name="tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="dinner, italian, pasta"
      />

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit">{isEdit ? "Update Recipe" : "Create Recipe"}</Button>
      </div>
    </form>
  );
}
