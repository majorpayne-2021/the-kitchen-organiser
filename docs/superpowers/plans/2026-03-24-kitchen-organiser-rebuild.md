# Kitchen Organiser Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Kitchen Organiser from Flask/Python to Next.js/React/TypeScript with 100% feature parity, improved mobile experience, and user accounts.

**Architecture:** Next.js 15 App Router with feature-based route groups, Prisma ORM over SQLite, Tailwind CSS with custom earthy palette, sharp for image processing, cheerio for recipe scraping. Netflix-style profile picker for user accounts.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, SQLite, sharp, cheerio, Docker

**Spec:** `docs/superpowers/specs/2026-03-24-kitchen-organiser-rebuild-design.md`

---

## File Structure

```
kitchen-organiser/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .env                              # DATABASE_URL
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── .gitignore
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/                   # auto-generated
│
├── public/
│   ├── photos/                       # recipe/event/gift photos
│   └── avatars/                      # user avatar photos
│
├── src/
│   ├── app/
│   │   ├── globals.css               # Tailwind directives + Google Fonts
│   │   ├── layout.tsx                # root layout (nav, profile, font loading)
│   │   ├── page.tsx                  # dashboard
│   │   │
│   │   ├── (recipes)/
│   │   │   └── recipes/
│   │   │       ├── page.tsx          # recipe list + search + filter
│   │   │       ├── new/
│   │   │       │   └── page.tsx      # new recipe form
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # recipe detail
│   │   │           └── edit/
│   │   │               └── page.tsx  # edit recipe form
│   │   │
│   │   ├── (meals)/
│   │   │   └── meal-plans/
│   │   │       ├── page.tsx          # meal plan list
│   │   │       ├── new/
│   │   │       │   └── page.tsx      # new meal plan form
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # meal plan detail
│   │   │           ├── edit/
│   │   │           │   └── page.tsx  # edit meal plan form
│   │   │           └── grocery/
│   │   │               └── page.tsx  # grocery list
│   │   │
│   │   ├── (events)/
│   │   │   └── event-plans/
│   │   │       ├── page.tsx          # event list
│   │   │       └── [id]/
│   │   │           └── page.tsx      # event detail
│   │   │
│   │   ├── (gifts)/
│   │   │   └── gifts/
│   │   │       ├── page.tsx          # gift list
│   │   │       └── [id]/
│   │   │           └── page.tsx      # gift detail
│   │   │
│   │   ├── (braindump)/
│   │   │   └── braindump/
│   │   │       └── page.tsx          # brain dump
│   │   │
│   │   ├── (search)/
│   │   │   └── search/
│   │   │       └── page.tsx          # ingredient search
│   │   │
│   │   └── api/
│   │       ├── recipes/
│   │       │   └── route.ts          # GET recipe search JSON
│   │       ├── upload/
│   │       │   └── route.ts          # POST photo upload
│   │       ├── scraper/
│   │       │   └── route.ts          # POST recipe import
│   │       └── suggest/
│   │           └── route.ts          # POST AI suggestions (Phase 2 stub)
│   │
│   ├── actions/
│   │   ├── recipe-actions.ts         # recipe CRUD server actions
│   │   ├── photo-actions.ts          # photo management server actions
│   │   ├── note-actions.ts           # recipe note server actions
│   │   ├── meal-plan-actions.ts      # meal plan CRUD server actions
│   │   ├── event-actions.ts          # event-specific server actions
│   │   ├── gift-actions.ts           # gift hamper server actions
│   │   ├── braindump-actions.ts      # braindump server actions
│   │   └── user-actions.ts           # user profile server actions
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tag.tsx
│   │   │   └── FlashMessage.tsx
│   │   ├── Navbar.tsx
│   │   ├── MobileTabBar.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── PhotoUpload.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ProfilePicker.tsx
│   │   ├── RecipeForm.tsx
│   │   ├── IngredientInput.tsx
│   │   ├── MealPlanGrid.tsx
│   │   └── GroceryList.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── ingredients.ts            # parser + category lookup
│   │   ├── scraper.ts                # recipe scraping
│   │   ├── grocery.ts                # grocery list aggregation
│   │   ├── photos.ts                 # upload + thumbnail generation
│   │   └── auth.ts                   # session/cookie management
│   │
│   ├── middleware.ts                  # profile session check
│   │
│   └── types/
│       └── index.ts                  # shared TypeScript types
│
├── scripts/
│   └── migrate-data.ts               # one-time data migration
│
└── __tests__/
    ├── lib/
    │   ├── ingredients.test.ts
    │   ├── scraper.test.ts
    │   ├── grocery.test.ts
    │   └── photos.test.ts
    ├── actions/
    │   ├── recipe-actions.test.ts
    │   └── meal-plan-actions.test.ts
    └── components/
        ├── RecipeCard.test.tsx
        └── Navbar.test.tsx
```

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.env`, `.env.example`, `.gitignore`, `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /home/claude/project
npx create-next-app@latest kitchen-organiser --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full project scaffold with TypeScript, Tailwind, ESLint, App Router, and `src/` directory.

- [ ] **Step 2: Verify project runs**

```bash
cd kitchen-organiser
npm run dev
```

Expected: Dev server starts on port 3000.

- [ ] **Step 3: Install additional dependencies**

```bash
npm install prisma @prisma/client sharp cheerio uuid
npm install -D @types/uuid vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Configure Tailwind with earthy color palette**

Replace `tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: "#faf8f6",
          100: "#f5efe8",
          200: "#ece7e1",
          300: "#e0d5c8",
          400: "#d8cfc4",
          500: "#b5a99a",
          600: "#8a8078",
          700: "#6b6b6b",
          800: "#2c2c2c",
        },
        accent: {
          DEFAULT: "#c69f73",
          hover: "#b08a5f",
          light: "#f5efe8",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        tag: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Configure globals.css with Google Fonts**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap");
```

- [ ] **Step 6: Set up environment files**

Create `.env`:
```
DATABASE_URL="file:./dev.db"
```

Create `.env.example`:
```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 7: Update .gitignore**

Append to `.gitignore`:
```
# Database
prisma/dev.db
prisma/dev.db-journal

# Photos (user content)
public/photos/*
!public/photos/.gitkeep
public/avatars/*
!public/avatars/.gitkeep

# Environment
.env
.env.local
```

Create empty `.gitkeep` files:
```bash
mkdir -p public/photos public/avatars
touch public/photos/.gitkeep public/avatars/.gitkeep
```

- [ ] **Step 8: Set up Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 9: Set up minimal root layout**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Kitchen Organiser",
  description: "Your household kitchen management app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-warm-50 text-warm-800 font-sans antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Set up minimal home page**

Replace `src/app/page.tsx` with:

```tsx
export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="font-serif text-4xl font-semibold text-warm-800">
        The Kitchen Organiser
      </h1>
    </div>
  );
}
```

- [ ] **Step 11: Verify everything works**

```bash
npm run dev
npm run build
npm test
```

Expected: Dev server shows "The Kitchen Organiser" heading. Build succeeds. Tests pass (no tests yet, but runner works).

- [ ] **Step 12: Commit**

```bash
git add kitchen-organiser/
git commit -m "feat: scaffold Next.js project with Tailwind earthy theme"
```

---

## Task 2: Prisma Schema & Database Setup

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`, `src/types/index.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
cd kitchen-organiser
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id             Int          @id @default(autoincrement())
  name           String
  avatarFilename String?
  createdAt      DateTime     @default(now())
  cookingLogs    CookingLog[]
}

model CookingLog {
  id       Int      @id @default(autoincrement())
  userId   Int
  recipeId Int
  cookedAt DateTime @default(now())
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe   Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
}

model Recipe {
  id          Int          @id @default(autoincrement())
  title       String
  description String?
  prepTime    Int?
  cookTime    Int?
  servings    Int?
  source      String?
  steps       String?      // JSON array of strings
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  ingredients Ingredient[]
  photos      Photo[]
  notes       Note[]
  tags        RecipeTag[]
  mealPlanItems MealPlanItem[]
  cookingLogs CookingLog[]
}

model Ingredient {
  id              Int     @id @default(autoincrement())
  recipeId        Int
  name            String
  quantity        Float?
  unit            String?
  groceryCategory String?
  sortOrder       Int     @default(0)
  recipe          Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
}

model Tag {
  id      Int         @id @default(autoincrement())
  name    String      @unique
  recipes RecipeTag[]
}

model RecipeTag {
  recipeId Int
  tagId    Int
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([recipeId, tagId])
}

model Photo {
  id        Int      @id @default(autoincrement())
  recipeId  Int
  filename  String
  caption   String?
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
}

model Note {
  id        Int      @id @default(autoincrement())
  recipeId  Int
  content   String
  createdAt DateTime @default(now())
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
}

model MealPlan {
  id        Int              @id @default(autoincrement())
  name      String
  planType  String           @default("weekly") // "weekly" or "event"
  eventDate String?
  eventTime String?
  createdAt DateTime         @default(now())
  items     MealPlanItem[]
  dayNotes  MealPlanDayNote[]
  eventNotes EventNote[]
  eventPhotos EventPhoto[]
  invitees  EventInvitee[]
}

model MealPlanItem {
  id               Int      @id @default(autoincrement())
  mealPlanId       Int
  recipeId         Int?
  freeText         String?
  slotLabel        String
  servingsOverride Int?
  sortOrder        Int      @default(0)
  mealPlan         MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  recipe           Recipe?  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
}

model MealPlanDayNote {
  id         Int      @id @default(autoincrement())
  mealPlanId Int
  day        String
  content    String
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
}

model EventNote {
  id         Int      @id @default(autoincrement())
  mealPlanId Int
  content    String
  createdAt  DateTime @default(now())
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
}

model EventPhoto {
  id         Int      @id @default(autoincrement())
  mealPlanId Int
  filename   String
  caption    String?
  createdAt  DateTime @default(now())
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
}

model EventInvitee {
  id         Int      @id @default(autoincrement())
  mealPlanId Int
  name       String
  inviteSent Boolean  @default(false)
  rsvp       String   @default("pending") // "pending", "attending", "not attending"
  dietary    String?
  createdAt  DateTime @default(now())
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
}

model GiftHamper {
  id        Int              @id @default(autoincrement())
  title     String
  giftDate  String?
  createdAt DateTime         @default(now())
  items     GiftHamperItem[]
  photos    GiftPhoto[]
}

model GiftHamperItem {
  id          Int        @id @default(autoincrement())
  hamperId    Int
  description String
  checked     Boolean    @default(false)
  note        String?
  sortOrder   Int        @default(0)
  hamper      GiftHamper @relation(fields: [hamperId], references: [id], onDelete: Cascade)
}

model GiftPhoto {
  id        Int        @id @default(autoincrement())
  hamperId  Int
  filename  String
  caption   String?
  createdAt DateTime   @default(now())
  hamper    GiftHamper @relation(fields: [hamperId], references: [id], onDelete: Cascade)
}

model Braindump {
  id        Int      @id @default(autoincrement())
  content   String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Create TypeScript types**

Create `src/types/index.ts`:

```typescript
import type { Recipe, Ingredient, Tag, Photo, Note, MealPlan, MealPlanItem, GiftHamper, GiftHamperItem, User } from "@prisma/client";

// Recipe with all relations loaded
export type RecipeWithRelations = Recipe & {
  ingredients: Ingredient[];
  photos: Photo[];
  notes: Note[];
  tags: (RecipeTag & { tag: Tag })[];
};

// Needed because Prisma generates RecipeTag without tag included
type RecipeTag = { recipeId: number; tagId: number };

// Recipe card (list view) — lighter than full relations
export type RecipeCard = Recipe & {
  photos: Photo[];
  tags: ({ tag: Tag })[];
};

// Meal plan with items
export type MealPlanWithItems = MealPlan & {
  items: (MealPlanItem & { recipe: Recipe | null })[];
};

// Gift hamper with items
export type GiftHamperWithItems = GiftHamper & {
  items: GiftHamperItem[];
  photos: GiftPhoto[];
};

type GiftPhoto = { id: number; hamperId: number; filename: string; caption: string | null; createdAt: Date };

// Parsed ingredient result
export type ParsedIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

// Grocery list item
export type GroceryItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

// Grocery list grouped by category
export type GroceryList = Record<string, GroceryItem[]>;

// Ingredient search result
export type IngredientSearchResult = {
  recipe: Recipe;
  matched: string[];
  missing: string[];
  matchPct: number;
};
```

- [ ] **Step 5: Run Prisma migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created, database file `prisma/dev.db` generated, Prisma Client generated.

- [ ] **Step 6: Verify Prisma Studio works**

```bash
npx prisma studio
```

Expected: Opens browser with empty database tables visible.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/db.ts src/types/
git commit -m "feat: add Prisma schema with all 16 models and TypeScript types"
```

---

## Task 3: Shared Library — Ingredient Parser

**Files:**
- Create: `src/lib/ingredients.ts`, `__tests__/lib/ingredients.test.ts`

Port of `resources/the-kitchen-organiser/helpers.py` (parse_ingredient, parse_fraction, guess_category, UNITS, CATEGORY_LOOKUP, FRACTIONS).

- [ ] **Step 1: Write failing tests for ingredient parsing**

Create `__tests__/lib/ingredients.test.ts`:

```typescript
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
      quantity: 2,
      unit: "cups",
      name: "flour",
    });
  });

  it("parses fraction + unit + name", () => {
    expect(parseIngredient("1/2 tsp salt")).toEqual({
      quantity: 0.5,
      unit: "tsp",
      name: "salt",
    });
  });

  it("parses quantity + size + name", () => {
    expect(parseIngredient("3 large eggs")).toEqual({
      quantity: 3,
      unit: "large",
      name: "eggs",
    });
  });

  it("parses plain text as name only", () => {
    expect(parseIngredient("salt and pepper to taste")).toEqual({
      quantity: null,
      unit: null,
      name: "salt and pepper to taste",
    });
  });

  it("strips 'of' from name", () => {
    expect(parseIngredient("2 cups of flour")).toEqual({
      quantity: 2,
      unit: "cups",
      name: "flour",
    });
  });

  it("handles empty string", () => {
    expect(parseIngredient("")).toEqual({
      quantity: null,
      unit: null,
      name: "",
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd kitchen-organiser
npm test -- __tests__/lib/ingredients.test.ts
```

Expected: FAIL — module `@/lib/ingredients` not found.

- [ ] **Step 3: Implement ingredient parser**

Create `src/lib/ingredients.ts`:

```typescript
/**
 * Ingredient parsing, category lookup, and search helpers.
 * Port of resources/the-kitchen-organiser/helpers.py
 */

import type { ParsedIngredient } from "@/types";

// Common units for parsing ingredient lines
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

// Category lookup for common grocery items
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

// Unicode fraction mappings
const FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅚": 5 / 6,
};

export function parseFraction(s: string): number | null {
  s = s.trim();
  if (!s) return null;

  // Check for unicode fractions
  for (const [fracChar, fracVal] of Object.entries(FRACTIONS)) {
    if (s.includes(fracChar)) {
      const parts = s.split(fracChar);
      const whole = parts[0].trim() ? parseFloat(parts[0]) : 0;
      return whole + fracVal;
    }
  }

  // Check for slash fractions like 1/2
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

  // Match leading number (with optional fraction)
  const m = rest.match(
    /^(\d+\s*[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]|\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*(.*)/
  );
  if (m) {
    quantity = parseFraction(m[1]);
    rest = m[2];
  } else {
    // Check for leading unicode fraction alone
    for (const [fracChar, fracVal] of Object.entries(FRACTIONS)) {
      if (line.startsWith(fracChar)) {
        quantity = fracVal;
        rest = line.slice(fracChar.length).trim();
        break;
      }
    }
  }

  // Try to match a unit
  let unit: string | null = null;
  const restLower = rest.toLowerCase();
  for (const u of UNITS) {
    if (
      restLower.startsWith(u) &&
      (rest.length === u.length || " \t.,".includes(rest[u.length]))
    ) {
      unit = u;
      rest = rest.slice(u.length).trim().replace(/^[.,]\s*/, "");
      break;
    }
  }

  // Strip leading "of " from name
  if (rest.toLowerCase().startsWith("of ")) {
    rest = rest.slice(3);
  }

  return { quantity, unit, name: rest.trim() };
}

export function guessCategory(ingredientName: string): string {
  const nameLower = ingredientName.toLowerCase().trim();
  // Try exact match first
  if (nameLower in CATEGORY_LOOKUP) return CATEGORY_LOOKUP[nameLower];
  // Try substring match
  for (const [key, cat] of Object.entries(CATEGORY_LOOKUP)) {
    if (key.includes(nameLower) || nameLower.includes(key)) return cat;
  }
  return "other";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/ingredients.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredients.ts __tests__/lib/ingredients.test.ts
git commit -m "feat: add ingredient parser with category lookup (port of helpers.py)"
```

---

## Task 4: Shared Library — Grocery Aggregation

**Files:**
- Create: `src/lib/grocery.ts`, `__tests__/lib/grocery.test.ts`

Port of `helpers.py` aggregate_grocery_list function.

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/grocery.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/grocery.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement grocery aggregation**

Create `src/lib/grocery.ts`:

```typescript
/**
 * Grocery list aggregation.
 * Port of aggregate_grocery_list from helpers.py
 */

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
  // Group by (normalized name, unit)
  const combined = new Map<
    string,
    { quantity: number; unit: string | null; category: string }
  >();

  for (const item of items) {
    const name = item.name.toLowerCase().trim();
    const unit = (item.unit || "").toLowerCase().trim();
    const key = `${name}||${unit}`;

    const existing = combined.get(key) || {
      quantity: 0,
      unit: item.unit,
      category: item.groceryCategory || guessCategory(name),
    };

    const qty = item.quantity || 0;
    existing.quantity += qty * item.servingsRatio;
    combined.set(key, existing);
  }

  // Group by category
  const grouped = new Map<string, { name: string; quantity: number | null; unit: string | null }[]>();

  const sortedKeys = [...combined.keys()].sort();
  for (const key of sortedKeys) {
    const info = combined.get(key)!;
    const name = key.split("||")[0];
    const entry = {
      name: name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      quantity: info.quantity ? Math.round(info.quantity * 100) / 100 : null,
      unit: info.unit,
    };

    const list = grouped.get(info.category) || [];
    list.push(entry);
    grouped.set(info.category, list);
  }

  // Sort categories in preferred order
  const result: GroceryList = {};
  for (const cat of CATEGORY_ORDER) {
    if (grouped.has(cat)) result[cat] = grouped.get(cat)!;
  }
  for (const [cat, items] of grouped) {
    if (!(cat in result)) result[cat] = items;
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/grocery.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/grocery.ts __tests__/lib/grocery.test.ts
git commit -m "feat: add grocery list aggregation (port of helpers.py)"
```

---

## Task 5: Shared Library — Photo Handling

**Files:**
- Create: `src/lib/photos.ts`, `__tests__/lib/photos.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/photos.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateFilename, getThumbFilename, isAllowedExtension } from "@/lib/photos";

describe("photo utilities", () => {
  it("generates UUID filename with extension", () => {
    const name = generateFilename("jpg");
    expect(name).toMatch(/^[a-f0-9]{32}\.jpg$/);
  });

  it("generates thumbnail filename", () => {
    expect(getThumbFilename("abc123.jpg")).toBe("thumb_abc123.jpg");
  });

  it("validates allowed extensions", () => {
    expect(isAllowedExtension("jpg")).toBe(true);
    expect(isAllowedExtension("jpeg")).toBe(true);
    expect(isAllowedExtension("png")).toBe(true);
    expect(isAllowedExtension("webp")).toBe(true);
    expect(isAllowedExtension("gif")).toBe(true);
    expect(isAllowedExtension("exe")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/photos.test.ts
```

- [ ] **Step 3: Implement photo utilities**

Create `src/lib/photos.ts`:

```typescript
/**
 * Photo upload, processing, and thumbnail generation.
 * Uses sharp for image processing (replaces Pillow).
 */

import sharp from "sharp";
import { randomUUID } from "crypto";
import path from "path";
import { writeFile, unlink } from "fs/promises";

const THUMB_SIZE = 400;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export function generateFilename(ext: string): string {
  return `${randomUUID().replace(/-/g, "")}.${ext.toLowerCase()}`;
}

export function getThumbFilename(filename: string): string {
  return `thumb_${filename}`;
}

export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext.toLowerCase());
}

export async function processAndSavePhoto(
  buffer: Buffer,
  ext: string,
  outputDir: string,
  prefix: string = ""
): Promise<string> {
  const filename = `${prefix}${generateFilename(ext)}`;
  const filepath = path.join(outputDir, filename);
  const thumbPath = path.join(outputDir, getThumbFilename(filename));

  // Auto-rotate based on EXIF and save full-size
  await sharp(buffer).rotate().toFile(filepath);

  // Generate thumbnail (fit within 400x400, preserving aspect ratio)
  await sharp(buffer)
    .rotate()
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside" })
    .toFile(thumbPath);

  return filename;
}

export async function deletePhoto(
  filename: string,
  photoDir: string
): Promise<void> {
  const filepath = path.join(photoDir, filename);
  const thumbPath = path.join(photoDir, getThumbFilename(filename));

  await unlink(filepath).catch(() => {});
  await unlink(thumbPath).catch(() => {});
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/photos.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/photos.ts __tests__/lib/photos.test.ts
git commit -m "feat: add photo processing with sharp (thumbnails, EXIF rotation)"
```

---

## Task 6: Shared Library — Recipe Scraper

**Files:**
- Create: `src/lib/scraper.ts`, `__tests__/lib/scraper.test.ts`

Port of `resources/the-kitchen-organiser/scraper.py`. Uses cheerio + fetch instead of BeautifulSoup + requests.

- [ ] **Step 1: Write failing tests for scraper utilities**

Create `__tests__/lib/scraper.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  parseIsoDuration,
  isYouTubeUrl,
  extractSchemaRecipe,
  cleanText,
} from "@/lib/scraper";

describe("parseIsoDuration", () => {
  it("parses minutes", () => {
    expect(parseIsoDuration("PT30M")).toBe(30);
  });

  it("parses hours and minutes", () => {
    expect(parseIsoDuration("PT1H30M")).toBe(90);
  });

  it("parses hours only", () => {
    expect(parseIsoDuration("PT2H")).toBe(120);
  });

  it("handles days", () => {
    expect(parseIsoDuration("P1DT0H")).toBe(1440);
  });

  it("returns null for invalid", () => {
    expect(parseIsoDuration(null)).toBeNull();
    expect(parseIsoDuration("")).toBeNull();
    expect(parseIsoDuration("not a duration")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("detects youtube.com watch URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("detects youtu.be URLs", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("detects shorts URLs", () => {
    expect(isYouTubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
  });

  it("rejects non-YouTube URLs", () => {
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});

describe("cleanText", () => {
  it("strips HTML tags", () => {
    expect(cleanText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes HTML entities", () => {
    expect(cleanText("salt &amp; pepper")).toBe("salt & pepper");
  });
});

describe("extractSchemaRecipe", () => {
  it("finds Recipe in JSON-LD", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type": "Recipe", "name": "Test Recipe", "recipeIngredient": ["1 cup flour"]}
        </script>
      </head><body></body></html>
    `;
    const result = extractSchemaRecipe(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Recipe");
  });

  it("finds Recipe in @graph", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@graph": [{"@type": "WebPage"}, {"@type": "Recipe", "name": "Graph Recipe"}]}
        </script>
      </head><body></body></html>
    `;
    const result = extractSchemaRecipe(html);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Graph Recipe");
  });

  it("returns null when no recipe found", () => {
    const html = `<html><head></head><body>No recipe here</body></html>`;
    expect(extractSchemaRecipe(html)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/scraper.test.ts
```

- [ ] **Step 3: Implement scraper**

Create `src/lib/scraper.ts`:

```typescript
/**
 * Recipe scraper — extracts recipe data from URLs.
 * Port of resources/the-kitchen-organiser/scraper.py
 * Uses cheerio (replaces BeautifulSoup) + fetch (replaces requests).
 */

import * as cheerio from "cheerio";
import { processAndSavePhoto } from "./photos";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 10000;

type ScrapedRecipe = {
  title: string;
  description: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  source: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  imageFilename: string | null;
};

// ── Public API ──────────────────────────────────────────────────────────────

export async function scrapeUrl(
  url: string,
  photoDir: string
): Promise<ScrapedRecipe> {
  url = url.trim();
  if (!url) throw new Error("URL is required.");

  if (isYouTubeUrl(url)) {
    return scrapeYouTube(url, photoDir);
  }
  return scrapeRecipeSite(url, photoDir);
}

// ── YouTube ─────────────────────────────────────────────────────────────────

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

export function isYouTubeUrl(url: string): boolean {
  return YT_PATTERNS.some((p) => p.test(url));
}

function extractVideoId(url: string): string | null {
  for (const p of YT_PATTERNS) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function scrapeYouTube(
  url: string,
  photoDir: string
): Promise<ScrapedRecipe> {
  const videoId = extractVideoId(url);
  const resp = await fetchWithTimeout(url);
  const html = await resp.text();
  const $ = cheerio.load(html);

  // Extract title
  let title = $('meta[property="og:title"]').attr("content") || "";
  if (!title) {
    title = ($("title").text() || "").replace(" - YouTube", "").trim();
  }

  // Extract description
  let descriptionText = $('meta[property="og:description"]').attr("content") || "";
  const fullDesc = extractYouTubeFullDescription(html);
  if (fullDesc && fullDesc.length > descriptionText.length) {
    descriptionText = fullDesc;
  }

  const { ingredients, steps, shortDescription } =
    parseYouTubeDescription(descriptionText);

  // Download thumbnail
  let imageFilename: string | null = null;
  if (videoId) {
    imageFilename = await downloadYouTubeThumbnail(videoId, photoDir);
  }

  return {
    title: cleanText(title),
    description: cleanText(shortDescription),
    prepTime: null,
    cookTime: null,
    servings: null,
    source: url,
    ingredients,
    steps,
    tags: [],
    imageFilename,
  };
}

function extractYouTubeFullDescription(html: string): string | null {
  const patterns = [
    /"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"description"\s*:\s*\{\s*"simpleText"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      return m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  return null;
}

const INGREDIENT_HEADERS =
  /^(?:ingredients?|what you'?ll? need|you'?ll? need|shopping list)\s*[:.]?\s*$/i;
const STEP_HEADERS =
  /^(?:instructions?|method|directions?|steps?|how to make(?: it)?|preparation)\s*[:.]?\s*$/i;
const TIMESTAMP_LINE = /^\d{1,2}:\d{2}/;

function parseYouTubeDescription(text: string): {
  ingredients: string[];
  steps: string[];
  shortDescription: string;
} {
  if (!text) return { ingredients: [], steps: [], shortDescription: "" };

  const lines = text.split("\n").map((l) => l.trim());
  let ingredientStart: number | null = null;
  let stepStart: number | null = null;
  let ingredientEnd: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (TIMESTAMP_LINE.test(lines[i])) continue;
    if (INGREDIENT_HEADERS.test(lines[i])) {
      ingredientStart = i + 1;
    } else if (STEP_HEADERS.test(lines[i])) {
      if (ingredientStart !== null && ingredientEnd === null) {
        ingredientEnd = i;
      }
      stepStart = i + 1;
    }
  }

  const ingredients: string[] = [];
  const steps: string[] = [];

  if (ingredientStart !== null) {
    const end = ingredientEnd ?? stepStart ?? lines.length;
    for (const line of lines.slice(ingredientStart, end)) {
      const cleaned = line.replace(/^[•\-●◦▪★☆✓✔·]\s*/, "").trim();
      if (cleaned && !TIMESTAMP_LINE.test(cleaned) && !STEP_HEADERS.test(cleaned)) {
        ingredients.push(cleaned);
      }
    }
  }

  if (stepStart !== null) {
    for (const line of lines.slice(stepStart)) {
      const cleaned = line.replace(/^[•\-●◦▪★☆✓✔·]\s*/, "").trim();
      if (!cleaned) continue;
      if (cleaned.startsWith("http") || cleaned.startsWith("www.")) break;
      const withoutNumber = cleaned.replace(/^\d+[.)]\s*/, "");
      if (withoutNumber) steps.push(withoutNumber);
    }
  }

  const firstSection = Math.min(
    ...[ingredientStart, stepStart, lines.length].filter(
      (x): x is number => x !== null
    )
  );
  const descLines = lines
    .slice(0, Math.max(0, firstSection - 1))
    .filter((l) => l && !TIMESTAMP_LINE.test(l));
  const shortDescription = descLines.slice(0, 3).join(" ");

  return { ingredients, steps, shortDescription };
}

async function downloadYouTubeThumbnail(
  videoId: string,
  photoDir: string
): Promise<string | null> {
  for (const quality of ["maxresdefault", "hqdefault"]) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        if (buffer.length > 1000) {
          return processAndSavePhoto(buffer, "jpg", photoDir);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── Recipe Websites (Schema.org) ────────────────────────────────────────────

async function scrapeRecipeSite(
  url: string,
  photoDir: string
): Promise<ScrapedRecipe> {
  const resp = await fetchWithTimeout(url);
  const html = await resp.text();
  const recipeData = extractSchemaRecipe(html);

  if (!recipeData) throw new Error("No recipe data found at this URL.");

  const title = recipeData.name || "";
  const description = recipeData.description || "";
  const prepTime = parseIsoDuration(recipeData.prepTime);
  const cookTime = parseIsoDuration(recipeData.cookTime);
  const servings = parseServings(recipeData.recipeYield);
  const ingredients = extractIngredients(recipeData);
  const steps = extractSteps(recipeData);
  const tags = extractTags(recipeData);

  let imageFilename: string | null = null;
  const imageUrl = extractImageUrl(recipeData);
  if (imageUrl) {
    imageFilename = await downloadImage(imageUrl, photoDir);
  }

  return {
    title: cleanText(title),
    description: cleanText(description),
    prepTime,
    cookTime,
    servings,
    source: url,
    ingredients,
    steps,
    tags,
    imageFilename,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractSchemaRecipe(html: string): any | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const data = JSON.parse($(scripts[i]).html() || "");
      const recipe = findRecipeInSchema(data);
      if (recipe) return recipe;
    } catch {
      continue;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findRecipeInSchema(data: any): any | null {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const schemaType = data["@type"];
    const types = Array.isArray(schemaType) ? schemaType : [schemaType];
    if (types.includes("Recipe")) return data;
    if (data["@graph"]) return findRecipeInSchema(data["@graph"]);
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecipeInSchema(item);
      if (result) return result;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractIngredients(recipeData: any): string[] {
  let ingredients = recipeData.recipeIngredient || [];
  if (typeof ingredients === "string") ingredients = [ingredients];
  return ingredients.filter(Boolean).map((ing: string) => cleanText(ing));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSteps(recipeData: any): string[] {
  const instructions = recipeData.recipeInstructions || [];

  if (typeof instructions === "string") {
    return instructions
      .split(/\n+|\.\s+(?=\d)/)
      .map((s: string) => cleanText(s))
      .filter(Boolean);
  }

  const steps: string[] = [];
  for (const item of instructions) {
    if (typeof item === "string") {
      steps.push(cleanText(item));
    } else if (typeof item === "object" && item !== null) {
      if (item["@type"] === "HowToStep") {
        steps.push(cleanText(item.text || ""));
      } else if (item["@type"] === "HowToSection") {
        if (item.name) steps.push(`** ${item.name} **`);
        for (const sub of item.itemListElement || []) {
          if (typeof sub === "string") steps.push(cleanText(sub));
          else if (typeof sub === "object") steps.push(cleanText(sub.text || ""));
        }
      }
    }
  }
  return steps.filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTags(recipeData: any): string[] {
  const tags: string[] = [];
  const category = recipeData.recipeCategory;
  if (typeof category === "string") {
    tags.push(...category.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean));
  } else if (Array.isArray(category)) {
    tags.push(...category.map((t: string) => t.trim().toLowerCase()).filter(Boolean));
  }

  const keywords = recipeData.keywords;
  if (typeof keywords === "string") {
    tags.push(...keywords.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean));
  } else if (Array.isArray(keywords)) {
    tags.push(...keywords.map((t: string) => t.trim().toLowerCase()).filter(Boolean));
  }

  // Deduplicate preserving order
  return [...new Set(tags)];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(recipeData: any): string | null {
  const image = recipeData.image;
  if (!image) return null;
  if (typeof image === "string") return image;
  if (typeof image === "object" && !Array.isArray(image)) return image.url || null;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === "string") return first;
    if (typeof first === "object") return first?.url || null;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseServings(yieldVal: any): number | null {
  if (yieldVal == null) return null;
  if (typeof yieldVal === "number") return Math.floor(yieldVal);
  if (Array.isArray(yieldVal)) yieldVal = yieldVal[0];
  if (typeof yieldVal === "string") {
    const m = yieldVal.match(/\d+/);
    return m ? parseInt(m[0]) : null;
  }
  return null;
}

export function parseIsoDuration(duration: unknown): number | null {
  if (!duration || typeof duration !== "string") return null;

  const m = duration.trim().match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;

  const days = parseInt(m[1] || "0");
  const hours = parseInt(m[2] || "0");
  const minutes = parseInt(m[3] || "0");

  const total = days * 24 * 60 + hours * 60 + minutes;
  return total > 0 ? total : null;
}

export function cleanText(text: string): string {
  if (!text) return "";
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return cleaned.trim();
}

async function downloadImage(
  url: string,
  photoDir: string
): Promise<string | null> {
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("Content-Type") || "";
    if (!contentType.includes("image") && !/\.(jpg|jpeg|png|webp)$/i.test(url)) {
      return null;
    }

    let ext = "jpg";
    if (contentType.includes("png") || url.toLowerCase().endsWith(".png")) ext = "png";
    else if (contentType.includes("webp") || url.toLowerCase().endsWith(".webp")) ext = "webp";

    const buffer = Buffer.from(await resp.arrayBuffer());
    return processAndSavePhoto(buffer, ext, photoDir);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/scraper.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper.ts __tests__/lib/scraper.test.ts
git commit -m "feat: add recipe scraper for Schema.org and YouTube (port of scraper.py)"
```

---

## Task 7: Auth — Session Management & Middleware

**Files:**
- Create: `src/lib/auth.ts`, `src/middleware.ts`, `src/components/ProfilePicker.tsx`

- [ ] **Step 1: Implement auth utilities**

Create `src/lib/auth.ts`:

```typescript
/**
 * Lightweight session management via cookies.
 * No passwords — Netflix-style profile picker for a household app.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "kitchen-user-id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const id = parseInt(cookie.value, 10);
  return isNaN(id) ? null : id;
}

export async function setCurrentUserId(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId.toString(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

- [ ] **Step 2: Create middleware for session check**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kitchen-user-id";
const PUBLIC_PATHS = ["/profile", "/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/photos") || pathname.startsWith("/avatars")) {
    return NextResponse.next();
  }

  // Check for user session
  const userId = request.cookies.get(COOKIE_NAME);
  if (!userId?.value) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 3: Create ProfilePicker component**

Create `src/components/ProfilePicker.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

type UserProfile = {
  id: number;
  name: string;
  avatarFilename: string | null;
};

export default function ProfilePicker({ users }: { users: UserProfile[] }) {
  const router = useRouter();

  async function selectUser(userId: number) {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-50">
      <h1 className="font-serif text-4xl font-semibold text-warm-800 mb-2">
        The Kitchen Organiser
      </h1>
      <p className="text-warm-600 mb-12">Who&apos;s cooking?</p>
      <div className="flex gap-8">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => selectUser(user.id)}
            className="flex flex-col items-center gap-3 group cursor-pointer"
          >
            <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center text-3xl font-semibold text-white overflow-hidden transition-transform group-hover:scale-105">
              {user.avatarFilename ? (
                <Image
                  src={`/avatars/${user.avatarFilename}`}
                  alt={user.name}
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-warm-800 font-medium text-lg group-hover:text-accent transition-colors">
              {user.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create profile page and API route**

Create `src/app/profile/page.tsx`:

```tsx
import { prisma } from "@/lib/db";
import ProfilePicker from "@/components/ProfilePicker";

export default async function ProfilePage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, avatarFilename: true },
    orderBy: { id: "asc" },
  });

  return <ProfilePicker users={users} />;
}
```

Create `src/app/api/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { setCurrentUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (typeof userId !== "number") {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  await setCurrentUserId(userId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/middleware.ts src/components/ProfilePicker.tsx src/app/profile/ src/app/api/profile/
git commit -m "feat: add Netflix-style profile picker with cookie session"
```

---

## Task 8: Seed Data & Data Migration Script

**Files:**
- Create: `prisma/seed.ts`, `scripts/migrate-data.ts`

- [ ] **Step 1: Create seed script for default users**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed default users
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Jennifer" },
  });
  await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Matus" },
  });

  console.log("Seed complete: 2 users created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Install tsx: `npm install -D tsx`

- [ ] **Step 2: Create data migration script**

Create `scripts/migrate-data.ts`:

```typescript
/**
 * One-time migration from the old SQLite database to the new Prisma-managed database.
 *
 * Usage: npx tsx scripts/migrate-data.ts
 *
 * Reads from: resources/kitchen-organiser-privatedata/recipes.db
 * Writes to:  prisma/dev.db (via Prisma client)
 * Copies photos from: resources/kitchen-organiser-privatedata/photos/
 * Copies to: public/photos/
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLD_DB_PATH = join(__dirname, "..", "..", "resources", "kitchen-organiser-privatedata", "recipes.db");
const OLD_PHOTOS_DIR = join(__dirname, "..", "..", "resources", "kitchen-organiser-privatedata", "photos");
const NEW_PHOTOS_DIR = join(__dirname, "..", "public", "photos");

const prisma = new PrismaClient();

async function main() {
  if (!existsSync(OLD_DB_PATH)) {
    console.error(`Old database not found at ${OLD_DB_PATH}`);
    process.exit(1);
  }

  const oldDb = new Database(OLD_DB_PATH, { readonly: true });
  mkdirSync(NEW_PHOTOS_DIR, { recursive: true });

  // Migrate recipes
  const recipes = oldDb.prepare("SELECT * FROM recipe").all() as any[];
  console.log(`Migrating ${recipes.length} recipes...`);

  for (const r of recipes) {
    const recipe = await prisma.recipe.create({
      data: {
        id: r.id,
        title: r.title,
        description: r.description,
        prepTime: r.prep_time,
        cookTime: r.cook_time,
        servings: r.servings,
        source: r.source,
        steps: r.steps,
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      },
    });

    // Migrate ingredients for this recipe
    const ingredients = oldDb.prepare("SELECT * FROM ingredient WHERE recipe_id = ?").all(r.id) as any[];
    for (const ing of ingredients) {
      await prisma.ingredient.create({
        data: {
          recipeId: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          groceryCategory: ing.grocery_category,
          sortOrder: ing.sort_order || 0,
        },
      });
    }

    // Migrate photos
    const photos = oldDb.prepare("SELECT * FROM photo WHERE recipe_id = ?").all(r.id) as any[];
    for (const photo of photos) {
      await prisma.photo.create({
        data: {
          recipeId: recipe.id,
          filename: photo.filename,
          caption: photo.caption,
          isPrimary: photo.is_primary === 1,
          createdAt: photo.created_at ? new Date(photo.created_at) : new Date(),
        },
      });
      // Copy photo files
      copyPhotoFile(photo.filename);
    }

    // Migrate notes
    const notes = oldDb.prepare("SELECT * FROM note WHERE recipe_id = ?").all(r.id) as any[];
    for (const note of notes) {
      await prisma.note.create({
        data: {
          recipeId: recipe.id,
          content: note.content,
          createdAt: note.created_at ? new Date(note.created_at) : new Date(),
        },
      });
    }
  }

  // Migrate tags and recipe-tag relationships
  const tags = oldDb.prepare("SELECT * FROM tag").all() as any[];
  console.log(`Migrating ${tags.length} tags...`);
  for (const t of tags) {
    await prisma.tag.create({ data: { id: t.id, name: t.name } });
  }

  const recipeTags = oldDb.prepare("SELECT * FROM recipe_tag").all() as any[];
  for (const rt of recipeTags) {
    await prisma.recipeTag.create({
      data: { recipeId: rt.recipe_id, tagId: rt.tag_id },
    });
  }

  // Migrate meal plans
  const mealPlans = oldDb.prepare("SELECT * FROM meal_plan").all() as any[];
  console.log(`Migrating ${mealPlans.length} meal plans...`);
  for (const mp of mealPlans) {
    await prisma.mealPlan.create({
      data: {
        id: mp.id,
        name: mp.name,
        planType: mp.plan_type || "weekly",
        eventDate: mp.event_date,
        eventTime: mp.event_time,
        createdAt: mp.created_at ? new Date(mp.created_at) : new Date(),
      },
    });

    // Meal plan items
    const items = oldDb.prepare("SELECT * FROM meal_plan_item WHERE meal_plan_id = ?").all(mp.id) as any[];
    for (const item of items) {
      await prisma.mealPlanItem.create({
        data: {
          mealPlanId: mp.id,
          recipeId: item.recipe_id,
          freeText: item.free_text,
          slotLabel: item.slot_label,
          servingsOverride: item.servings_override,
          sortOrder: item.sort_order || 0,
        },
      });
    }

    // Day notes
    const dayNotes = oldDb.prepare("SELECT * FROM meal_plan_day_note WHERE meal_plan_id = ?").all(mp.id) as any[];
    for (const dn of dayNotes) {
      await prisma.mealPlanDayNote.create({
        data: { mealPlanId: mp.id, day: dn.day, content: dn.content },
      });
    }

    // Event notes
    const eventNotes = oldDb.prepare("SELECT * FROM event_note WHERE meal_plan_id = ?").all(mp.id) as any[];
    for (const en of eventNotes) {
      await prisma.eventNote.create({
        data: {
          mealPlanId: mp.id,
          content: en.content,
          createdAt: en.created_at ? new Date(en.created_at) : new Date(),
        },
      });
    }

    // Event photos
    const eventPhotos = oldDb.prepare("SELECT * FROM event_photo WHERE meal_plan_id = ?").all(mp.id) as any[];
    for (const ep of eventPhotos) {
      await prisma.eventPhoto.create({
        data: {
          mealPlanId: mp.id,
          filename: ep.filename,
          caption: ep.caption,
          createdAt: ep.created_at ? new Date(ep.created_at) : new Date(),
        },
      });
      copyPhotoFile(ep.filename);
    }

    // Invitees
    const invitees = oldDb.prepare("SELECT * FROM event_invitee WHERE meal_plan_id = ?").all(mp.id) as any[];
    for (const inv of invitees) {
      await prisma.eventInvitee.create({
        data: {
          mealPlanId: mp.id,
          name: inv.name,
          inviteSent: inv.invite_sent === 1,
          rsvp: inv.rsvp || "pending",
          dietary: inv.dietary,
          createdAt: inv.created_at ? new Date(inv.created_at) : new Date(),
        },
      });
    }
  }

  // Migrate gift hampers
  const hampers = oldDb.prepare("SELECT * FROM gift_hamper").all() as any[];
  console.log(`Migrating ${hampers.length} gift hampers...`);
  for (const h of hampers) {
    await prisma.giftHamper.create({
      data: {
        id: h.id,
        title: h.title,
        giftDate: h.gift_date,
        createdAt: h.created_at ? new Date(h.created_at) : new Date(),
      },
    });

    const items = oldDb.prepare("SELECT * FROM gift_hamper_item WHERE hamper_id = ?").all(h.id) as any[];
    for (const item of items) {
      await prisma.giftHamperItem.create({
        data: {
          hamperId: h.id,
          description: item.description,
          checked: item.checked === 1,
          note: item.note,
          sortOrder: item.sort_order || 0,
        },
      });
    }

    const photos = oldDb.prepare("SELECT * FROM gift_photo WHERE hamper_id = ?").all(h.id) as any[];
    for (const p of photos) {
      await prisma.giftPhoto.create({
        data: {
          hamperId: h.id,
          filename: p.filename,
          caption: p.caption,
          createdAt: p.created_at ? new Date(p.created_at) : new Date(),
        },
      });
      copyPhotoFile(p.filename);
    }
  }

  // Migrate braindump
  const braindumps = oldDb.prepare("SELECT * FROM braindump").all() as any[];
  console.log(`Migrating ${braindumps.length} braindump entries...`);
  for (const b of braindumps) {
    await prisma.braindump.create({
      data: {
        content: b.content,
        createdAt: b.created_at ? new Date(b.created_at) : new Date(),
      },
    });
  }

  oldDb.close();
  console.log("Migration complete!");
}

function copyPhotoFile(filename: string) {
  if (!filename) return;
  // Copy both original and thumbnail
  for (const name of [filename, `thumb_${filename}`]) {
    const src = join(OLD_PHOTOS_DIR, name);
    const dst = join(NEW_PHOTOS_DIR, name);
    if (existsSync(src) && !existsSync(dst)) {
      copyFileSync(src, dst);
    }
  }
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Install better-sqlite3 for migration: `npm install -D better-sqlite3 @types/better-sqlite3`

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: "Seed complete: 2 users created"

- [ ] **Step 4: Run migration script**

```bash
npx tsx scripts/migrate-data.ts
```

Expected: All 24 recipes, tags, meal plans, gifts, and photos migrated. Verify with Prisma Studio (`npx prisma studio`).

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts scripts/migrate-data.ts package.json
git commit -m "feat: add seed data (users) and data migration script from old database"
```

---

## Task 9: UI Components — Shared Building Blocks

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Tag.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/FlashMessage.tsx`, `src/components/Navbar.tsx`, `src/components/MobileTabBar.tsx`, `src/components/RecipeCard.tsx`

This is a meaningful design task. Each component defines the visual language of the app.

- [ ] **Step 1: Create base UI components**

Create `src/components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
  };
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-warm-100 text-warm-800 hover:bg-warm-200 border border-warm-200",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

Create `src/components/ui/Card.tsx`:

```tsx
import { HTMLAttributes } from "react";

export default function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white rounded-card border border-warm-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

Create `src/components/ui/Input.tsx`:

```tsx
import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-warm-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2 border border-warm-200 rounded-lg bg-white text-warm-800 placeholder:text-warm-500 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${className}`}
        {...props}
      />
    </div>
  );
}
```

Create `src/components/ui/Tag.tsx`:

```tsx
export default function Tag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium bg-accent-light text-accent-hover rounded-tag ${className}`}
    >
      {children}
    </span>
  );
}
```

Create `src/components/ui/Modal.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-card p-6 backdrop:bg-black/30 max-w-md w-full"
    >
      <h3 className="font-serif text-xl font-semibold mb-4">{title}</h3>
      {children}
    </dialog>
  );
}
```

Create `src/components/ui/FlashMessage.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export default function FlashMessage({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const colors = {
    success: "border-l-accent bg-accent-light",
    error: "border-l-red-500 bg-red-50",
  };

  return (
    <div className={`border-l-4 px-4 py-3 mb-4 rounded-r-lg ${colors[type]}`}>
      <p className="text-sm text-warm-800">{message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create Navbar component**

Create `src/components/Navbar.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-plans", label: "Meal Plans" },
  { href: "/event-plans", label: "Events" },
  { href: "/gifts", label: "Gifts" },
  { href: "/braindump", label: "Brain Dump" },
];

export default async function Navbar() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, avatarFilename: true },
      })
    : null;

  return (
    <nav className="sticky top-0 z-50 bg-warm-50/95 backdrop-blur border-b border-warm-200">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="font-serif text-xl font-semibold text-warm-800">
          The Kitchen Organiser
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-xs font-medium uppercase tracking-wider text-warm-600 hover:text-accent transition-colors pb-0.5 border-b-2 border-transparent hover:border-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* User avatar */}
        {user && (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-white overflow-hidden"
          >
            {user.avatarFilename ? (
              <Image
                src={`/avatars/${user.avatarFilename}`}
                alt={user.name}
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create MobileTabBar component**

Create `src/components/MobileTabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/recipes", label: "Recipes", icon: "📖" },
  { href: "/meal-plans", label: "Plans", icon: "📅" },
  { href: "/gifts", label: "Gifts", icon: "🎁" },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 z-50">
      <div className="flex justify-around py-2">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center text-xs ${
                isActive ? "text-accent" : "text-warm-600"
              }`}
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Create RecipeCard component**

Create `src/components/RecipeCard.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import Tag from "@/components/ui/Tag";
import Card from "@/components/ui/Card";
import type { RecipeCard as RecipeCardType } from "@/types";

export default function RecipeCard({ recipe }: { recipe: RecipeCardType }) {
  const primaryPhoto = recipe.photos.find((p) => p.isPrimary) || recipe.photos[0];

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
        {primaryPhoto ? (
          <Image
            src={`/photos/thumb_${primaryPhoto.filename}`}
            alt={recipe.title}
            width={400}
            height={300}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-warm-200 to-warm-300 flex items-center justify-center text-3xl text-accent">
            🍽
          </div>
        )}
        <div className="p-4">
          {recipe.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              {recipe.tags.slice(0, 3).map((rt) => (
                <Tag key={rt.tag.id}>{rt.tag.name}</Tag>
              ))}
            </div>
          )}
          <h3 className="font-serif text-lg font-semibold leading-tight mb-1">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-sm text-warm-600 line-clamp-2">{recipe.description}</p>
          )}
          <div className="flex gap-4 mt-3 pt-3 border-t border-warm-100 text-xs text-warm-600">
            {recipe.prepTime && <span>⏱ {recipe.prepTime}m prep</span>}
            {recipe.cookTime && <span>🔥 {recipe.cookTime}m cook</span>}
            {recipe.servings && <span>🍽 {recipe.servings} servings</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 5: Update root layout with Navbar and MobileTabBar**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Kitchen Organiser",
  description: "Your household kitchen management app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-warm-50 text-warm-800 font-sans antialiased">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 min-h-screen">
          {children}
        </main>
        <MobileTabBar />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify components render**

```bash
npm run dev
```

Navigate to `/profile` — should see profile picker with Jennifer and Matus. Select a profile, should redirect to home page with navbar visible.

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/app/layout.tsx
git commit -m "feat: add UI component library with Navbar, TabBar, RecipeCard"
```

---

## Task 10: Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement dashboard**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import RecipeCard from "@/components/RecipeCard";
import Card from "@/components/ui/Card";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  const [recipeCount, mealPlanCount, eventCount, giftCount] = await Promise.all([
    prisma.recipe.count(),
    prisma.mealPlan.count({ where: { planType: "weekly" } }),
    prisma.mealPlan.count({ where: { planType: "event" } }),
    prisma.giftHamper.count(),
  ]);

  const recentRecipes = await prisma.recipe.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      photos: true,
      tags: { include: { tag: true } },
    },
  });

  const greeting = getGreeting();

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium mb-0.5">
        {greeting}, {user?.name || "Chef"}
      </h1>
      <p className="text-warm-600 text-sm mb-8">
        {new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* AI Suggestion Card — Phase 2 placeholder */}
      <div className="bg-gradient-to-br from-warm-100 to-warm-300 border border-warm-300 rounded-[14px] p-6 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-hover mb-1">
          What shall we cook today?
        </p>
        <p className="font-serif text-lg font-semibold mb-3">
          Ask for inspiration based on your recipes and cooking history
        </p>
        <input
          className="w-full px-4 py-3 border border-warm-400 rounded-[10px] bg-white/70 text-sm placeholder:text-warm-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="I'm in the mood for something warm and Italian..."
          disabled
          title="Coming soon — AI suggestions"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { count: recipeCount, label: "Recipes", href: "/recipes" },
          { count: mealPlanCount, label: "Meal Plans", href: "/meal-plans" },
          { count: eventCount, label: "Events", href: "/event-plans" },
          { count: giftCount, label: "Gift Hampers", href: "/gifts" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-5 hover:shadow-sm transition-shadow">
              <p className="font-serif text-3xl font-semibold text-accent">{stat.count}</p>
              <p className="text-xs text-warm-600 mt-1">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Recipes */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold">Recent Recipes</h2>
        <Link href="/recipes" className="text-sm text-accent font-medium hover:text-accent-hover">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
```

- [ ] **Step 2: Verify dashboard renders with real data**

```bash
npm run dev
```

Navigate to `/`. Should see greeting, stats (24 recipes, etc.), and recent recipe cards with photos.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add dashboard with stats, greeting, and recent recipes"
```

---

## Task 11: Recipe List, Detail, Create, and Edit Pages

**Files:**
- Create: `src/app/(recipes)/recipes/page.tsx`, `src/app/(recipes)/recipes/[id]/page.tsx`, `src/app/(recipes)/recipes/new/page.tsx`, `src/app/(recipes)/recipes/[id]/edit/page.tsx`
- Create: `src/actions/recipe-actions.ts`, `src/actions/photo-actions.ts`, `src/actions/note-actions.ts`
- Create: `src/components/RecipeForm.tsx`, `src/components/IngredientInput.tsx`, `src/components/PhotoUpload.tsx`, `src/components/PhotoGallery.tsx`, `src/components/SearchBar.tsx`
- Create: `src/app/api/recipes/route.ts`, `src/app/api/upload/route.ts`, `src/app/api/scraper/route.ts`

This is the largest task — the core recipe CRUD. I'll provide the key files and describe the pattern; remaining files follow the same structure.

- [ ] **Step 1: Create recipe server actions**

Create `src/actions/recipe-actions.ts`:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseIngredient, guessCategory } from "@/lib/ingredients";

export async function createRecipe(formData: FormData) {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const prepTime = formData.get("prepTime") ? parseInt(formData.get("prepTime") as string) : null;
  const cookTime = formData.get("cookTime") ? parseInt(formData.get("cookTime") as string) : null;
  const servings = formData.get("servings") ? parseInt(formData.get("servings") as string) : null;
  const source = (formData.get("source") as string) || null;
  const stepsRaw = (formData.get("steps") as string) || "[]";
  const ingredientLines = formData.getAll("ingredients") as string[];
  const tagNames = ((formData.get("tags") as string) || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);

  const steps = JSON.stringify(
    stepsRaw.split("\n").map(s => s.trim()).filter(Boolean)
  );

  const recipe = await prisma.recipe.create({
    data: {
      title,
      description,
      prepTime,
      cookTime,
      servings,
      source,
      steps,
    },
  });

  // Create ingredients
  for (let i = 0; i < ingredientLines.length; i++) {
    const line = ingredientLines[i].trim();
    if (!line) continue;
    const parsed = parseIngredient(line);
    await prisma.ingredient.create({
      data: {
        recipeId: recipe.id,
        name: parsed.name || line,
        quantity: parsed.quantity,
        unit: parsed.unit,
        groceryCategory: guessCategory(parsed.name || line),
        sortOrder: i,
      },
    });
  }

  // Create tags
  for (const tagName of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    await prisma.recipeTag.create({
      data: { recipeId: recipe.id, tagId: tag.id },
    });
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const prepTime = formData.get("prepTime") ? parseInt(formData.get("prepTime") as string) : null;
  const cookTime = formData.get("cookTime") ? parseInt(formData.get("cookTime") as string) : null;
  const servings = formData.get("servings") ? parseInt(formData.get("servings") as string) : null;
  const source = (formData.get("source") as string) || null;
  const stepsRaw = (formData.get("steps") as string) || "[]";
  const ingredientLines = formData.getAll("ingredients") as string[];
  const tagNames = ((formData.get("tags") as string) || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);

  const steps = JSON.stringify(
    stepsRaw.split("\n").map(s => s.trim()).filter(Boolean)
  );

  await prisma.recipe.update({
    where: { id },
    data: { title, description, prepTime, cookTime, servings, source, steps },
  });

  // Replace ingredients
  await prisma.ingredient.deleteMany({ where: { recipeId: id } });
  for (let i = 0; i < ingredientLines.length; i++) {
    const line = ingredientLines[i].trim();
    if (!line) continue;
    const parsed = parseIngredient(line);
    await prisma.ingredient.create({
      data: {
        recipeId: id,
        name: parsed.name || line,
        quantity: parsed.quantity,
        unit: parsed.unit,
        groceryCategory: guessCategory(parsed.name || line),
        sortOrder: i,
      },
    });
  }

  // Replace tags
  await prisma.recipeTag.deleteMany({ where: { recipeId: id } });
  for (const tagName of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    await prisma.recipeTag.create({
      data: { recipeId: id, tagId: tag.id },
    });
  }

  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: number) {
  // Get photos to delete from filesystem
  const photos = await prisma.photo.findMany({ where: { recipeId: id } });
  const { deletePhoto } = await import("@/lib/photos");
  const photoDir = process.cwd() + "/public/photos";
  for (const photo of photos) {
    await deletePhoto(photo.filename, photoDir);
  }

  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
  redirect("/recipes");
}
```

- [ ] **Step 2: Create photo and note server actions**

Create `src/actions/photo-actions.ts`:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { deletePhoto } from "@/lib/photos";

export async function setPhotoPrimary(photoId: number, recipeId: number) {
  // Unset all primary photos for this recipe
  await prisma.photo.updateMany({
    where: { recipeId },
    data: { isPrimary: false },
  });
  // Set this one as primary
  await prisma.photo.update({
    where: { id: photoId },
    data: { isPrimary: true },
  });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function deletePhotoAction(photoId: number) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return;

  const photoDir = process.cwd() + "/public/photos";
  await deletePhoto(photo.filename, photoDir);
  await prisma.photo.delete({ where: { id: photoId } });
  revalidatePath(`/recipes/${photo.recipeId}`);
}
```

Create `src/actions/note-actions.ts`:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addNote(recipeId: number, content: string) {
  await prisma.note.create({ data: { recipeId, content } });
  revalidatePath(`/recipes/${recipeId}`);
}

export async function editNote(noteId: number, content: string) {
  const note = await prisma.note.update({
    where: { id: noteId },
    data: { content },
  });
  revalidatePath(`/recipes/${note.recipeId}`);
}

export async function deleteNote(noteId: number) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return;
  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath(`/recipes/${note.recipeId}`);
}
```

- [ ] **Step 3: Create recipe list page**

Create `src/app/(recipes)/recipes/page.tsx`:

```tsx
import { prisma } from "@/lib/db";
import RecipeCard from "@/components/RecipeCard";
import Tag from "@/components/ui/Tag";
import Link from "next/link";
import Button from "@/components/ui/Button";

type Props = {
  searchParams: Promise<{ q?: string; tag?: string }>;
};

export default async function RecipesPage({ searchParams }: Props) {
  const { q, tag } = await searchParams;

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { source: { contains: q } },
      { ingredients: { some: { name: { contains: q } } } },
    ];
  }
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const [recipes, allTags] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        photos: true,
        tags: { include: { tag: true } },
      },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Recipes</h1>
        <Link href="/recipes/new">
          <Button>+ New Recipe</Button>
        </Link>
      </div>

      {/* Search and filters */}
      <form className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search recipes..."
          className="flex-1 px-4 py-2 border border-warm-200 rounded-lg bg-white text-sm placeholder:text-warm-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <Link href="/recipes">
            <Tag className={!tag ? "!bg-accent !text-white" : ""}>All</Tag>
          </Link>
          {allTags.map((t) => (
            <Link key={t.id} href={`/recipes?tag=${t.name}`}>
              <Tag className={tag === t.name ? "!bg-accent !text-white" : ""}>{t.name}</Tag>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {recipes.length === 0 && (
        <p className="text-center text-warm-600 py-12">No recipes found.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create recipe detail page**

Create `src/app/(recipes)/recipes/[id]/page.tsx`. This is a key page — it shows the full recipe with photos, ingredients, steps, and notes. The implementation should follow the UI design from the spec (hero layout with photo + metadata, two-column ingredients/steps).

This is a substantial component (~150 lines). Create it following the pattern established by the dashboard and recipe list pages. It should:
- Fetch recipe with all relations (`include: { ingredients, photos, notes, tags }`)
- Display hero section with primary photo + metadata (prep/cook time, servings)
- Two-column layout: ingredients list (left) + numbered steps (right)
- Notes section with add/edit/delete using server actions
- Photo gallery with upload, set-primary, and delete
- Edit and delete buttons

- [ ] **Step 5: Create recipe form component and new/edit pages**

Create `src/components/RecipeForm.tsx` — a shared form component used by both `/recipes/new` and `/recipes/[id]/edit`. It should:
- Accept optional `recipe` prop for edit mode
- Fields: title, description, prepTime, cookTime, servings, source URL
- Dynamic ingredient lines (add/remove rows)
- Steps as a textarea (one step per line)
- Tags as comma-separated input
- Import from URL button that calls `/api/scraper` and pre-fills the form
- Submit calls `createRecipe` or `updateRecipe` server action

Create `src/app/(recipes)/recipes/new/page.tsx` and `src/app/(recipes)/recipes/[id]/edit/page.tsx` — thin wrappers around `RecipeForm`.

- [ ] **Step 6: Create API routes**

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { processAndSavePhoto, isAllowedExtension } from "@/lib/photos";
import { prisma } from "@/lib/db";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const recipeId = formData.get("recipeId") as string;
  const photoType = (formData.get("type") as string) || "recipe"; // recipe, event, gift, avatar

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!isAllowedExtension(ext)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const prefix = photoType === "event" ? "event_" : photoType === "gift" ? "gift_" : "";
  const dir = photoType === "avatar"
    ? path.join(process.cwd(), "public", "avatars")
    : path.join(process.cwd(), "public", "photos");

  const filename = await processAndSavePhoto(buffer, ext, dir, prefix);

  // Save to database based on type
  if (photoType === "recipe" && recipeId) {
    const hasPhotos = await prisma.photo.count({ where: { recipeId: parseInt(recipeId) } });
    await prisma.photo.create({
      data: {
        recipeId: parseInt(recipeId),
        filename,
        isPrimary: hasPhotos === 0,
      },
    });
  }

  return NextResponse.json({ filename });
}
```

Create `src/app/api/scraper/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";
import path from "path";

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  try {
    const photoDir = path.join(process.cwd(), "public", "photos");
    const result = await scrapeUrl(url, photoDir);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scraping failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

Create `src/app/api/recipes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";

  const recipes = await prisma.recipe.findMany({
    where: q ? {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    } : undefined,
    select: { id: true, title: true, servings: true },
    orderBy: { title: "asc" },
    take: 20,
  });

  return NextResponse.json(recipes);
}
```

- [ ] **Step 7: Verify recipe CRUD works end-to-end**

```bash
npm run dev
```

Test: browse recipes, view detail, create new recipe, edit recipe, delete recipe, upload photo, add note, import from URL.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(recipes\)/ src/actions/ src/components/ src/app/api/
git commit -m "feat: add complete recipe CRUD with search, import, photos, and notes"
```

---

## Task 12: Meal Plans, Events, Grocery Lists

**Files:**
- Create: all files under `src/app/(meals)/`, `src/app/(events)/`
- Create: `src/actions/meal-plan-actions.ts`, `src/actions/event-actions.ts`
- Create: `src/components/MealPlanGrid.tsx`, `src/components/GroceryList.tsx`

Follow the same patterns as recipe pages. Key specifics:

- [ ] **Step 1: Create meal plan server actions**

Create `src/actions/meal-plan-actions.ts` with: `createMealPlan`, `updateMealPlan`, `deleteMealPlan`, `addMealPlanItem`, `deleteMealPlanItem`, `saveDayNote`.

These mirror the Flask routes: `plan_new`, `plan_edit`, `plan_delete`, `plan_item_add`, `plan_item_delete`, `day_note_save`.

- [ ] **Step 2: Create event server actions**

Create `src/actions/event-actions.ts` with: `addInvitee`, `updateInvitee`, `deleteInvitee`, `addEventNote`, `deleteEventNote`, `uploadEventPhoto`, `deleteEventPhoto`.

- [ ] **Step 3: Create meal plan list page**

Create `src/app/(meals)/meal-plans/page.tsx` — lists weekly meal plans. Similar structure to recipe list but simpler (no photo grid).

- [ ] **Step 4: Create meal plan detail page with day grid**

Create `src/app/(meals)/meal-plans/[id]/page.tsx` — shows the weekly grid (Monday–Sunday × Breakfast/Lunch/Dinner/Dessert/Sides/Snack). Uses `MealPlanGrid` component.

Create `src/components/MealPlanGrid.tsx` — renders the day × slot grid. Items can be linked recipes or free text. Add-item forms per slot.

- [ ] **Step 5: Create meal plan form pages**

Create `src/app/(meals)/meal-plans/new/page.tsx` and `src/app/(meals)/meal-plans/[id]/edit/page.tsx`.

- [ ] **Step 6: Create grocery list page**

Create `src/app/(meals)/meal-plans/[id]/grocery/page.tsx`. Uses `aggregateGroceryList` from `src/lib/grocery.ts`. Renders grouped list by category with quantities.

Create `src/components/GroceryList.tsx` — renders the categorized grocery list. Print-friendly layout.

- [ ] **Step 7: Create event plan pages**

Create `src/app/(events)/event-plans/page.tsx` — lists events (upcoming and past, sorted by date).

Create `src/app/(events)/event-plans/[id]/page.tsx` — event detail with: category-based menu (Savoury, Salads & Sides, Sweet, Drinks), guest list with RSVP tracking, dietary notes, event photos, event notes.

- [ ] **Step 8: Verify all meal plan and event features**

Test: create/edit/delete meal plans, add items to slots, generate grocery list, create events, add invitees, update RSVP, upload event photos.

- [ ] **Step 9: Commit**

```bash
git add src/app/\(meals\)/ src/app/\(events\)/ src/actions/ src/components/
git commit -m "feat: add meal plans, events, and grocery lists"
```

---

## Task 13: Gifts, Brain Dump, Ingredient Search

**Files:**
- Create: all files under `src/app/(gifts)/`, `src/app/(braindump)/`, `src/app/(search)/`
- Create: `src/actions/gift-actions.ts`, `src/actions/braindump-actions.ts`

- [ ] **Step 1: Create gift server actions**

Create `src/actions/gift-actions.ts` with: `createGiftHamper`, `deleteGiftHamper`, `addGiftItem`, `toggleGiftItem`, `addGiftItemNote`, `deleteGiftItem`, `updateGiftDate`, `uploadGiftPhoto`, `deleteGiftPhoto`.

- [ ] **Step 2: Create gift pages**

Create `src/app/(gifts)/gifts/page.tsx` — gift hamper list (upcoming and past).
Create `src/app/(gifts)/gifts/[id]/page.tsx` — gift detail with item checklist, progress bar, photos.

- [ ] **Step 3: Create braindump server actions and page**

Create `src/actions/braindump-actions.ts` with: `addBraindump`, `deleteBraindump`.

Create `src/app/(braindump)/braindump/page.tsx` — free-form notes list with add/delete. Simple text entries with timestamps.

- [ ] **Step 4: Create ingredient search page**

Create `src/app/(search)/search/page.tsx` — "What Can I Make?" search. User enters available ingredients, results ranked by match percentage.

Implement `searchByIngredients` in `src/lib/ingredients.ts` (add to existing file):

```typescript
export async function searchByIngredients(
  ingredientNames: string[]
): Promise<IngredientSearchResult[]> {
  const { prisma } = await import("@/lib/db");
  const searchTerms = ingredientNames.map(n => n.toLowerCase().trim()).filter(Boolean);
  if (!searchTerms.length) return [];

  const recipes = await prisma.recipe.findMany({
    include: { ingredients: true },
    orderBy: { title: "asc" },
  });

  const results: IngredientSearchResult[] = [];

  for (const recipe of recipes) {
    const ingredientNamesList = recipe.ingredients.map(i => i.name.toLowerCase());
    const matched: string[] = [];

    for (const term of searchTerms) {
      for (const ingName of ingredientNamesList) {
        if (ingName.includes(term) || term.includes(ingName)) {
          matched.push(ingName.charAt(0).toUpperCase() + ingName.slice(1));
          break;
        }
      }
    }

    if (!matched.length) continue;

    const missing = ingredientNamesList
      .filter(name => !matched.map(m => m.toLowerCase()).includes(name))
      .map(n => n.charAt(0).toUpperCase() + n.slice(1));

    const total = ingredientNamesList.length || 1;
    const matchPct = Math.round((matched.length / total) * 100);

    results.push({ recipe, matched, missing, matchPct });
  }

  results.sort((a, b) => b.matchPct - a.matchPct);
  return results;
}
```

(Add `IngredientSearchResult` import at top of file.)

- [ ] **Step 5: Verify all features**

Test: create gift hampers, add/check items, upload gift photos, add braindump notes, search by ingredients.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(gifts\)/ src/app/\(braindump\)/ src/app/\(search\)/ src/actions/ src/lib/ingredients.ts
git commit -m "feat: add gifts, brain dump, and ingredient search"
```

---

## Task 14: User Avatar Upload

**Files:**
- Create: `src/actions/user-actions.ts`
- Modify: `src/components/ProfilePicker.tsx`, `src/app/profile/page.tsx`

- [ ] **Step 1: Create user actions**

Create `src/actions/user-actions.ts`:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateAvatar(userId: number, filename: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { avatarFilename: filename },
  });
  revalidatePath("/profile");
  revalidatePath("/");
}
```

- [ ] **Step 2: Add avatar upload to profile page**

Update `src/app/profile/page.tsx` to include avatar upload functionality. Each profile should show an upload button below the avatar that calls `/api/upload` with `type: "avatar"`, then calls `updateAvatar` action.

- [ ] **Step 3: Verify avatar upload**

Test: upload avatar for Jennifer and Matus, verify it shows in nav and profile picker.

- [ ] **Step 4: Commit**

```bash
git add src/actions/user-actions.ts src/app/profile/ src/components/ProfilePicker.tsx
git commit -m "feat: add custom avatar upload for user profiles"
```

---

## Task 15: AI Suggestions Stub (Phase 2)

**Files:**
- Create: `src/app/api/suggest/route.ts`

- [ ] **Step 1: Create stub API route**

Create `src/app/api/suggest/route.ts`:

```typescript
import { NextResponse } from "next/server";

/**
 * AI Recipe Suggestions — Phase 2
 *
 * This route will:
 * 1. Collect context (cooking history, all recipes, season, time of day)
 * 2. Build a structured prompt for Claude API
 * 3. Return personalized recipe suggestions
 *
 * For now, returns a placeholder response.
 */
export async function POST() {
  return NextResponse.json({
    message: "AI suggestions coming soon! This feature will use Claude to suggest recipes based on your cooking history and preferences.",
    phase: 2,
    ready: false,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/suggest/
git commit -m "feat: stub AI suggestion endpoint for Phase 2"
```

---

## Task 16: Docker Deployment

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

- [ ] **Step 1: Create Dockerfile**

Create `kitchen-organiser/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install sharp dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npx prisma migrate deploy
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/public/photos /app/public/avatars
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

Create `kitchen-organiser/docker-compose.yml`:

```yaml
services:
  kitchen-organiser:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data/kitchen.db:/app/prisma/prod.db
      - ./data/photos:/app/public/photos
      - ./data/avatars:/app/public/avatars
    environment:
      - DATABASE_URL=file:/app/prisma/prod.db
      - NODE_ENV=production
    restart: unless-stopped
```

- [ ] **Step 3: Update next.config.ts for standalone output**

Ensure `next.config.ts` includes:

```typescript
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
};
```

- [ ] **Step 4: Create .dockerignore**

Create `kitchen-organiser/.dockerignore`:

```
node_modules
.next
.git
*.md
__tests__
scripts
```

- [ ] **Step 5: Test Docker build**

```bash
docker compose build
docker compose up -d
```

Expected: App accessible at http://localhost:3000

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore next.config.ts
git commit -m "feat: add Docker deployment for homelab"
```

---

## Task 17: Final Verification & Cleanup

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify migration checklist**

Go through the migration checklist from the spec (Section 13):

- [ ] All 14 existing database tables ported to Prisma models
- [ ] Data migration script tested with real `recipes.db`
- [ ] All 24 recipes visible and correct in new app
- [ ] All photos display correctly (full-size and thumbnails)
- [ ] Recipe CRUD (create, read, update, delete) working
- [ ] Recipe import from URL (Schema.org + YouTube) working
- [ ] Ingredient search ("What Can I Make?") working
- [ ] Meal plan CRUD with day grid and free-text items working
- [ ] Grocery list generation working
- [ ] Event plan features (invitees, RSVP, event photos, notes) working
- [ ] Gift hamper features (items, check/uncheck, photos) working
- [ ] Brain dump working
- [ ] User profiles (Jennifer, Matus) with avatar upload working
- [ ] Mobile layout tested on phone
- [ ] Docker deployment tested

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
