import type { GroceryList } from "@/types";
import { guessCategory } from "./ingredients";

type GroceryInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  groceryCategory: string | null;
  servingsRatio: number;
};

const CATEGORY_ORDER = [
  "produce", "meat", "seafood", "dairy", "bakery", "pantry", "beverages", "other",
];

export function aggregateGroceryList(items: GroceryInput[]): GroceryList {
  const combined = new Map<string, { quantity: number; unit: string | null; category: string }>();

  for (const item of items) {
    const name = item.name.toLowerCase().trim();
    const unit = (item.unit || "").toLowerCase().trim();
    const key = `${name}||${unit}`;
    const existing = combined.get(key) || {
      quantity: 0, unit: item.unit,
      category: item.groceryCategory || guessCategory(name),
    };
    existing.quantity += (item.quantity || 0) * item.servingsRatio;
    combined.set(key, existing);
  }

  const grouped = new Map<string, { name: string; quantity: number | null; unit: string | null }[]>();
  const sortedKeys = [...combined.keys()].sort();
  for (const key of sortedKeys) {
    const info = combined.get(key)!;
    const name = key.split("||")[0];
    const entry = {
      name: name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      quantity: info.quantity ? Math.round(info.quantity * 100) / 100 : null,
      unit: info.unit,
    };
    const list = grouped.get(info.category) || [];
    list.push(entry);
    grouped.set(info.category, list);
  }

  const result: GroceryList = {};
  for (const cat of CATEGORY_ORDER) {
    if (grouped.has(cat)) result[cat] = grouped.get(cat)!;
  }
  for (const [cat, items] of grouped) {
    if (!(cat in result)) result[cat] = items;
  }
  return result;
}
