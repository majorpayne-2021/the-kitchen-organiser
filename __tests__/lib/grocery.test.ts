import { describe, it, expect } from "vitest";
import { aggregateGroceryList } from "@/lib/grocery";

describe("aggregateGroceryList", () => {
  it("aggregates duplicate ingredients", () => {
    const items = [
      { name: "flour", quantity: 2, unit: "cups", groceryCategory: "pantry", servingsRatio: 1 },
      { name: "flour", quantity: 1, unit: "cups", groceryCategory: "pantry", servingsRatio: 1 },
    ];
    const result = aggregateGroceryList(items);
    expect(result.pantry).toBeDefined();
    expect(result.pantry![0].quantity).toBe(3);
  });
  it("applies servings ratio", () => {
    const items = [
      { name: "butter", quantity: 100, unit: "g", groceryCategory: "dairy", servingsRatio: 2 },
    ];
    const result = aggregateGroceryList(items);
    expect(result.dairy![0].quantity).toBe(200);
  });
  it("groups by category in order", () => {
    const items = [
      { name: "salt", quantity: 1, unit: "tsp", groceryCategory: "pantry", servingsRatio: 1 },
      { name: "chicken", quantity: 500, unit: "g", groceryCategory: "meat", servingsRatio: 1 },
      { name: "onion", quantity: 1, unit: null, groceryCategory: "produce", servingsRatio: 1 },
    ];
    const result = aggregateGroceryList(items);
    const categories = Object.keys(result);
    expect(categories).toEqual(["produce", "meat", "pantry"]);
  });
  it("auto-detects category when not provided", () => {
    const items = [
      { name: "butter", quantity: 1, unit: "tbsp", groceryCategory: null, servingsRatio: 1 },
    ];
    const result = aggregateGroceryList(items);
    expect(result.dairy).toBeDefined();
  });
});
