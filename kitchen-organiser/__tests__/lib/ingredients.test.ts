import { describe, it, expect } from "vitest";
import { parseIngredient, parseFraction, guessCategory } from "@/lib/ingredients";

describe("parseFraction", () => {
  it("parses whole numbers", () => {
    expect(parseFraction("2")).toBe(2);
  });
  it("parses unicode fractions", () => {
    expect(parseFraction("½")).toBe(0.5);
  });
  it("parses mixed unicode fractions", () => {
    expect(parseFraction("1½")).toBe(1.5);
  });
  it("parses slash fractions", () => {
    expect(parseFraction("1/2")).toBe(0.5);
  });
  it("parses mixed slash fractions", () => {
    expect(parseFraction("1 1/2")).toBe(1.5);
  });
  it("returns null for empty string", () => {
    expect(parseFraction("")).toBeNull();
  });
});

describe("parseIngredient", () => {
  it("parses quantity + unit + name", () => {
    expect(parseIngredient("2 cups flour")).toEqual({
      quantity: 2, unit: "cups", name: "flour",
    });
  });
  it("parses fraction + unit + name", () => {
    expect(parseIngredient("1/2 tsp salt")).toEqual({
      quantity: 0.5, unit: "tsp", name: "salt",
    });
  });
  it("parses quantity + size + name", () => {
    expect(parseIngredient("3 large eggs")).toEqual({
      quantity: 3, unit: "large", name: "eggs",
    });
  });
  it("parses plain text as name only", () => {
    expect(parseIngredient("salt and pepper to taste")).toEqual({
      quantity: null, unit: null, name: "salt and pepper to taste",
    });
  });
  it("strips 'of' from name", () => {
    expect(parseIngredient("2 cups of flour")).toEqual({
      quantity: 2, unit: "cups", name: "flour",
    });
  });
  it("handles empty string", () => {
    expect(parseIngredient("")).toEqual({
      quantity: null, unit: null, name: "",
    });
  });
});

describe("guessCategory", () => {
  it("exact match", () => {
    expect(guessCategory("butter")).toBe("dairy");
  });
  it("substring match", () => {
    expect(guessCategory("chicken breast")).toBe("meat");
  });
  it("returns other for unknown", () => {
    expect(guessCategory("dragon fruit")).toBe("other");
  });
});
