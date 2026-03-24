import type { ParsedIngredient } from "@/types";

const UNITS = [
  "tablespoons", "tablespoon", "tbsp", "tbs",
  "teaspoons", "teaspoon", "tsp",
  "cups", "cup",
  "ounces", "ounce", "oz",
  "pounds", "pound", "lbs", "lb",
  "grams", "gram", "g",
  "kilograms", "kilogram", "kg",
  "milliliters", "milliliter", "ml",
  "liters", "liter", "l",
  "pinch", "pinches",
  "dash", "dashes",
  "cloves", "clove",
  "cans", "can",
  "packages", "package", "pkg",
  "slices", "slice",
  "pieces", "piece",
  "bunches", "bunch",
  "sprigs", "sprig",
  "stalks", "stalk",
  "heads", "head",
  "whole",
  "large", "medium", "small",
];

const CATEGORY_LOOKUP: Record<string, string> = {
  apple: "produce", avocado: "produce", banana: "produce",
  basil: "produce", "bell pepper": "produce", broccoli: "produce",
  carrot: "produce", celery: "produce", cilantro: "produce",
  corn: "produce", cucumber: "produce", garlic: "produce",
  ginger: "produce", "green onion": "produce", "jalapeño": "produce",
  kale: "produce", lemon: "produce", lettuce: "produce",
  lime: "produce", mango: "produce", mushroom: "produce",
  onion: "produce", orange: "produce", parsley: "produce",
  pea: "produce", pepper: "produce", potato: "produce",
  rosemary: "produce", scallion: "produce", shallot: "produce",
  spinach: "produce", squash: "produce", strawberry: "produce",
  thyme: "produce", tomato: "produce", zucchini: "produce",
  butter: "dairy", cheese: "dairy", cream: "dairy",
  "cream cheese": "dairy", egg: "dairy", eggs: "dairy",
  "half and half": "dairy", milk: "dairy", parmesan: "dairy",
  "sour cream": "dairy", yogurt: "dairy", mozzarella: "dairy",
  cheddar: "dairy", ricotta: "dairy", feta: "dairy",
  "heavy cream": "dairy", "whipping cream": "dairy",
  bacon: "meat", beef: "meat", chicken: "meat",
  "ground beef": "meat", "ground turkey": "meat", ham: "meat",
  lamb: "meat", pork: "meat", sausage: "meat",
  steak: "meat", turkey: "meat",
  cod: "seafood", crab: "seafood", halibut: "seafood",
  salmon: "seafood", shrimp: "seafood", tilapia: "seafood",
  tuna: "seafood",
  "baking powder": "pantry", "baking soda": "pantry",
  "black pepper": "pantry", bread: "pantry", "brown sugar": "pantry",
  cayenne: "pantry", "chili powder": "pantry", cinnamon: "pantry",
  "cocoa powder": "pantry", "coconut milk": "pantry",
  cornstarch: "pantry", cumin: "pantry", flour: "pantry",
  honey: "pantry", ketchup: "pantry", "maple syrup": "pantry",
  mayonnaise: "pantry", mustard: "pantry", nutmeg: "pantry",
  oil: "pantry", "olive oil": "pantry", oregano: "pantry",
  paprika: "pantry", pasta: "pantry",
  "red pepper flakes": "pantry", rice: "pantry", salt: "pantry",
  "sesame oil": "pantry", "soy sauce": "pantry", sugar: "pantry",
  "tomato paste": "pantry", "tomato sauce": "pantry",
  vanilla: "pantry", "vanilla extract": "pantry",
  "vegetable oil": "pantry", vinegar: "pantry",
  "worcestershire sauce": "pantry", yeast: "pantry",
  "bread crumbs": "bakery", tortilla: "bakery", pita: "bakery",
  naan: "bakery", baguette: "bakery",
  beer: "beverages", wine: "beverages", broth: "pantry",
  "chicken broth": "pantry", "beef broth": "pantry",
  "vegetable broth": "pantry", stock: "pantry",
};

const FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1/3, "⅔": 2/3, "¼": 0.25, "¾": 0.75,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1/6, "⅚": 5/6,
};

export function parseFraction(s: string): number | null {
  s = s.trim();
  if (!s) return null;
  for (const [fracChar, fracVal] of Object.entries(FRACTIONS)) {
    if (s.includes(fracChar)) {
      const parts = s.split(fracChar);
      const whole = parts[0].trim() ? parseFloat(parts[0]) : 0;
      return whole + fracVal;
    }
  }
  if (s.includes("/")) {
    const parts = s.split(/\s+/);
    if (parts.length === 2 && parts[1].includes("/")) {
      const whole = parseFloat(parts[0]);
      const [num, den] = parts[1].split("/");
      return whole + parseFloat(num) / parseFloat(den);
    } else if (parts[0].includes("/")) {
      const [num, den] = parts[0].split("/");
      return parseFloat(num) / parseFloat(den);
    }
  }
  const parsed = parseFloat(s);
  return isNaN(parsed) ? null : parsed;
}

export function parseIngredient(line: string): ParsedIngredient {
  line = line.trim();
  if (!line) return { quantity: null, unit: null, name: "" };
  let quantity: number | null = null;
  let rest = line;
  const m = rest.match(/^(\d+\s*[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]|\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*(.*)/);
  if (m) {
    quantity = parseFraction(m[1]);
    rest = m[2];
  } else {
    for (const [fracChar, fracVal] of Object.entries(FRACTIONS)) {
      if (line.startsWith(fracChar)) {
        quantity = fracVal;
        rest = line.slice(fracChar.length).trim();
        break;
      }
    }
  }
  let unit: string | null = null;
  const restLower = rest.toLowerCase();
  for (const u of UNITS) {
    if (restLower.startsWith(u) && (rest.length === u.length || " \t.,".includes(rest[u.length]))) {
      unit = u;
      rest = rest.slice(u.length).trim().replace(/^[.,]\s*/, "");
      break;
    }
  }
  if (rest.toLowerCase().startsWith("of ")) {
    rest = rest.slice(3);
  }
  return { quantity, unit, name: rest.trim() };
}

export function guessCategory(ingredientName: string): string {
  const nameLower = ingredientName.toLowerCase().trim();
  if (nameLower in CATEGORY_LOOKUP) return CATEGORY_LOOKUP[nameLower];
  for (const [key, cat] of Object.entries(CATEGORY_LOOKUP)) {
    if (key.includes(nameLower) || nameLower.includes(key)) return cat;
  }
  return "other";
}
