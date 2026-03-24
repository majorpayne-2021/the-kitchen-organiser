"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMealPlanItem, deleteMealPlanItem } from "@/actions/meal-plan-actions";
import Button from "@/components/ui/Button";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["Breakfast", "Lunch", "Dinner", "Dessert", "Sides", "Snack"];

type MealPlanItemData = {
  id: number;
  recipeId: number | null;
  freeText: string | null;
  slotLabel: string;
  recipe: { id: number; title: string } | null;
};

type Recipe = {
  id: number;
  title: string;
};

interface MealPlanGridProps {
  mealPlanId: number;
  items: MealPlanItemData[];
  recipes: Recipe[];
}

export default function MealPlanGrid({ mealPlanId, items, recipes }: MealPlanGridProps) {
  const router = useRouter();
  const [addingCell, setAddingCell] = useState<string | null>(null);

  function getItems(day: string, slot: string) {
    const label = `${day}::${slot}`;
    return items.filter((item) => item.slotLabel === label);
  }

  async function handleAdd(formData: FormData) {
    await addMealPlanItem(formData);
    setAddingCell(null);
    router.refresh();
  }

  async function handleDelete(itemId: number) {
    await deleteMealPlanItem(itemId, mealPlanId);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-medium text-warm-600 border-b border-warm-200 w-24" />
            {DAYS.map((day) => (
              <th
                key={day}
                className="p-2 text-left text-sm font-medium text-warm-600 border-b border-warm-200"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="p-2 text-sm font-medium text-warm-600 border-b border-warm-200 align-top">
                {slot}
              </td>
              {DAYS.map((day) => {
                const cellKey = `${day}::${slot}`;
                const cellItems = getItems(day, slot);
                const isAdding = addingCell === cellKey;

                return (
                  <td
                    key={cellKey}
                    className="p-2 border-b border-warm-200 border-l align-top min-w-[120px]"
                  >
                    {/* Existing items */}
                    <div className="space-y-1 mb-1">
                      {cellItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-1 text-xs">
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
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                            title="Remove"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add form */}
                    {isAdding ? (
                      <form action={handleAdd} className="space-y-1">
                        <input type="hidden" name="mealPlanId" value={mealPlanId} />
                        <input type="hidden" name="slotLabel" value={cellKey} />
                        <select
                          name="recipeId"
                          className="w-full text-xs px-1 py-0.5 border border-warm-200 rounded bg-white text-warm-800"
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
                          placeholder="Or type here..."
                          className="w-full text-xs px-1 py-0.5 border border-warm-200 rounded bg-white text-warm-800 placeholder:text-warm-600"
                        />
                        <div className="flex gap-1">
                          <Button type="submit" size="sm" className="text-xs px-1 py-0.5">
                            Add
                          </Button>
                          <button
                            type="button"
                            onClick={() => setAddingCell(null)}
                            className="text-xs text-warm-600 hover:text-warm-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingCell(cellKey)}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        + add
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
