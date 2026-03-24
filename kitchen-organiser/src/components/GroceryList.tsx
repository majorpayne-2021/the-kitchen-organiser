import type { GroceryList as GroceryListType } from "@/types";

interface GroceryListProps {
  groceryList: GroceryListType;
}

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  meat: "Meat",
  seafood: "Seafood",
  dairy: "Dairy",
  bakery: "Bakery",
  pantry: "Pantry",
  beverages: "Beverages",
  other: "Other",
};

export default function GroceryList({ groceryList }: GroceryListProps) {
  const categories = Object.keys(groceryList);

  if (categories.length === 0) {
    return (
      <p className="text-warm-600 text-center py-8">
        No grocery items to display. Add recipes to your meal plan first.
      </p>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="font-serif text-lg font-semibold text-warm-800 mb-2 capitalize">
            {CATEGORY_LABELS[category] || category}
          </h3>
          <ul className="space-y-1">
            {groceryList[category].map((item, idx) => (
              <li
                key={`${category}-${idx}`}
                className="flex items-baseline gap-2 text-warm-800 py-1 border-b border-warm-100 last:border-b-0"
              >
                <span className="w-4 h-4 border border-warm-300 rounded-sm flex-shrink-0 print:border-warm-400" />
                <span>
                  {item.quantity != null && (
                    <span className="font-medium text-accent">
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ""}
                      {" "}
                    </span>
                  )}
                  {item.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
