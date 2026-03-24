import type {
  Recipe,
  Ingredient,
  Tag,
  Photo,
  Note,
  MealPlan,
  MealPlanItem,
  GiftHamper,
  GiftHamperItem,
  User,
} from "@/generated/prisma";

export type RecipeWithRelations = Recipe & {
  ingredients: Ingredient[];
  photos: Photo[];
  notes: Note[];
  tags: ({ recipeId: number; tagId: number } & { tag: Tag })[];
};

export type RecipeCard = Recipe & {
  photos: Photo[];
  tags: { tag: Tag }[];
};

export type MealPlanWithItems = MealPlan & {
  items: (MealPlanItem & { recipe: Recipe | null })[];
};

export type GiftHamperWithItems = GiftHamper & {
  items: GiftHamperItem[];
  photos: {
    id: number;
    hamperId: number;
    filename: string;
    caption: string | null;
    createdAt: Date;
  }[];
};

export type ParsedIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

export type GroceryItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type GroceryList = Record<string, GroceryItem[]>;

export type IngredientSearchResult = {
  recipe: Recipe;
  matched: string[];
  missing: string[];
  matchPct: number;
};

export type { User };
