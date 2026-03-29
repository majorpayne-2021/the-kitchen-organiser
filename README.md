# The Kitchen Organiser

A household kitchen management app for recipes, meal planning, events, gift hampers, and grocery lists. Built for a two-person household (Jennifer & Matus) and deployed on a homelab via Docker.

Rebuilt from a Flask/Python app to Next.js/React/TypeScript.

## Features

- **Recipes** — Create, edit, search, tag, and import from URLs (Schema.org scraping). Multiple photos per recipe with auto-generated thumbnails.
- **Meal Plans** — Weekly meal plans with drag-and-drop slots. Override servings per item. Auto-generated grocery lists with ingredient aggregation.
- **Events** — Event meal planning with guest lists, RSVP tracking, dietary notes, photos, and event notes.
- **Gift Hampers** — Checklists for gift hampers with target dates, item notes, and photos.
- **Ingredient Search** — "What can I make?" — enter ingredients on hand, get recipes ranked by match percentage.
- **Brain Dump** — Quick note capture for recipe ideas, shopping reminders, etc.
- **Profile Picker** — Netflix-style user selection with custom avatar uploads. No passwords (local network only).
- **AI Suggestions** — Stubbed route at `/api/suggest/` for Phase 2 Claude API integration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 (custom earthy palette) |
| Database | SQLite via Prisma 7 ORM + better-sqlite3 |
| Images | sharp (auto-rotate, thumbnails at 400x400) |
| Scraping | cheerio (Schema.org JSON-LD + YouTube) |
| Testing | Vitest + Testing Library + jsdom |
| Deployment | Docker + docker-compose |

## Quick Start

### Option A: Dev Container (recommended)

Open the repo in VS Code. Accept the "Reopen in Container" prompt. The post-create script handles everything automatically.

### Option B: Local Setup

```bash
npm install
npm rebuild better-sqlite3
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Migrating Data from the Flask App

If you have the old database and photos in `previous/`:

```bash
npx tsx scripts/migrate-data.ts
```

This imports recipes, ingredients, photos, tags, meal plans, events, gift hampers, and braindump entries into the dev database.

## Data Layout

Data is stored outside the source tree and gitignored:

```
data/
├── dev/                    # Development data
│   ├── kitchen.db          # SQLite database
│   ├── photos/             # Recipe, event, and gift photos
│   └── avatars/            # User avatar photos
└── prod/                   # Production data (mounted by Docker)
    ├── kitchen.db
    ├── photos/
    └── avatars/
```

In development, `public/photos` and `public/avatars` are symlinks to `data/dev/`. In production, Docker bind-mounts `data/prod/` directly into the container.

## Production Deployment

```bash
docker compose up -d
```

This builds the app, runs it on port 3000, and mounts `data/prod/` for persistent storage. The container is stateless — all data lives on the host.

### docker-compose.yml volumes

```
data/prod/kitchen.db  →  /app/prisma/prod.db
data/prod/photos/     →  /app/public/photos/
data/prod/avatars/    →  /app/public/avatars/
```

## Project Structure

```
src/
├── app/
│   ├── (recipes)/          # Recipe CRUD, search, detail pages
│   ├── (meals)/            # Weekly meal plans, grocery lists
│   ├── (events)/           # Event planning with guest lists
│   ├── (gifts)/            # Gift hamper checklists
│   ├── (braindump)/        # Quick notes
│   ├── (search)/           # "What can I make?" ingredient search
│   ├── api/                # Upload, scraper, profile, suggest endpoints
│   ├── profile/            # User picker (Jennifer / Matus)
│   └── page.tsx            # Dashboard
├── actions/                # Server Actions (form submissions)
├── components/             # React components
│   └── ui/                 # Reusable UI primitives (Button, Card, Input, Tag, Modal)
├── lib/                    # Shared logic (db, auth, photos, scraping, ingredients)
├── proxy.ts                # Auth middleware (cookie check, redirect to /profile)
└── types/                  # TypeScript type definitions

prisma/
├── schema.prisma           # 18 models (Recipe, Ingredient, MealPlan, etc.)
├── seed.ts                 # Seeds Jennifer + Matus users
└── migrations/             # Schema migrations

.devcontainer/              # VS Code dev container config
scripts/                    # Data migration from Flask app
__tests__/                  # Vitest test suites
```

## Database Schema

18 models across 6 feature areas:

- **Users** — User, CookingLog
- **Recipes** — Recipe, Ingredient, Tag, RecipeTag, Photo, Note
- **Meal Plans** — MealPlan, MealPlanItem, MealPlanDayNote
- **Events** — EventNote, EventPhoto, EventInvitee
- **Gifts** — GiftHamper, GiftHamperItem, GiftPhoto
- **Notes** — Braindump

## Design

Earthy, warm aesthetic designed for mobile-first use (cooking with phone in hand):

- **Colors** — Warm browns and off-whites (`warm-50` through `warm-800`), gold-brown accent (`#c69f73`)
- **Fonts** — Cormorant Garamond (headings) + Inter (body)
- **Layout** — Bottom tab bar on mobile, top navbar on desktop
- **Cards** — 12px border radius, subtle shadows on hover

## Commands

```bash
npm run dev              # Development server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm test                 # Run tests
npm run test:watch       # Tests in watch mode
npm run clean            # Remove node_modules and .next

npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma migrate dev   # Apply schema migrations
npx prisma db seed       # Seed users (Jennifer, Matus)
npx prisma studio        # Visual database browser

docker compose up -d     # Production deployment
docker compose down      # Stop production
```
