# Kitchen Organiser — Full Rebuild Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Authors:** Jennifer & Claude (brainstorming session)

---

## 1. Context & Motivation

The Kitchen Organiser is a personal household kitchen management app currently built with Flask + SQLite + HTMX + Jinja2 + vanilla CSS. The app is functional and feature-complete, but its single-file architecture (~1300-line `app.py`) is not appropriate for continuous extension and modern workflows.

**Goals of the rebuild:**
- Migrate to an industry-standard, modular web framework
- Maintain 100% feature parity with the existing app
- Improve mobile experience (primary use case: cooking with phone in hand)
- Add lightweight user accounts to track cooking habits
- Prepare architecture for AI-powered recipe suggestions (Phase 2)
- Refresh the UI while preserving the earthy, minimalistic aesthetic
- Deploy on a homelab/home network server via Docker

**Users:** Jennifer and Matus — a two-person household. Accessed via local network (VPN available for remote access).

---

## 2. Technology Stack

| Layer | Technology | Replaces |
|-------|-----------|----------|
| Framework | Next.js 15 (App Router) | Flask 3.1 |
| UI Library | React 19 | Jinja2 templates |
| Language | TypeScript | Python |
| Styling | Tailwind CSS | Vanilla CSS |
| Database | SQLite (via Prisma ORM) | SQLite (raw SQL) |
| Image Processing | sharp | Pillow |
| HTML Scraping | cheerio + fetch | BeautifulSoup4 + requests |
| Deployment | Docker + docker-compose | launchd (macOS) |

### Why These Choices

**Next.js over Vite+Express or Remix:**
- Single project handles frontend and backend — one thing to deploy
- File-based routing maps naturally to the existing feature set
- Server-side rendering for fast mobile loads
- Largest ecosystem, most tutorials, most industry-relevant for learning
- React Server Components reduce JavaScript sent to the browser

**SQLite over PostgreSQL:**
- Two users with infrequent writes — SQLite handles this perfectly
- Zero maintenance (no database process to manage on homelab)
- Backup is copying one file
- WAL mode enables concurrent reads during writes
- Prisma ORM abstracts the database — switching to PostgreSQL later requires changing one line (`provider = "postgresql"`)

**Tailwind over vanilla CSS:**
- Utility-first approach builds designs directly in markup
- Custom color palette defined once in `tailwind.config.ts`, referenced everywhere
- Excellent responsive design utilities (`md:`, `lg:` prefixes)
- Combined with React components, UI is highly reusable

---

## 3. Project Structure

```
kitchen-organiser/
├── package.json
├── next.config.js
├── tailwind.config.ts          ← earthy color palette
├── tsconfig.json
│
├── prisma/
│   ├── schema.prisma           ← all models (replaces schema.sql)
│   ├── seed.ts                 ← seed data (replaces seed.py)
│   └── migrations/             ← auto-generated
│
├── public/
│   ├── photos/                 ← recipe/event/gift photos
│   ├── avatars/                ← user avatar photos
│   └── icons/                  ← PWA icons
│
├── src/
│   ├── app/                    ← Next.js App Router
│   │   ├── layout.tsx          ← root layout (nav, footer)
│   │   ├── page.tsx            ← dashboard
│   │   │
│   │   ├── (recipes)/          ← recipe feature group
│   │   │   ├── recipes/
│   │   │   │   └── page.tsx              ← /recipes list
│   │   │   ├── recipes/new/
│   │   │   │   └── page.tsx              ← /recipes/new form
│   │   │   └── recipes/[id]/
│   │   │       ├── page.tsx              ← /recipes/:id detail
│   │   │       └── edit/
│   │   │           └── page.tsx          ← /recipes/:id/edit
│   │   │
│   │   ├── (meals)/            ← meal planning feature group
│   │   │   ├── meal-plans/
│   │   │   │   └── page.tsx
│   │   │   ├── meal-plans/new/
│   │   │   │   └── page.tsx
│   │   │   └── meal-plans/[id]/
│   │   │       ├── page.tsx
│   │   │       ├── edit/
│   │   │       │   └── page.tsx
│   │   │       └── grocery/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (events)/           ← event planning feature group
│   │   │   ├── event-plans/
│   │   │   │   └── page.tsx
│   │   │   └── event-plans/[id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (gifts)/            ← gift tracking feature group
│   │   │   ├── gifts/
│   │   │   │   └── page.tsx
│   │   │   └── gifts/[id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (braindump)/        ← brain dump feature group
│   │   │   └── braindump/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (search)/           ← ingredient search
│   │   │   └── search/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                ← API routes
│   │       ├── recipes/
│   │       │   └── route.ts    ← recipe search JSON API
│   │       ├── upload/
│   │       │   └── route.ts    ← photo upload handling
│   │       ├── scraper/
│   │       │   └── route.ts    ← recipe import from URL
│   │       └── suggest/
│   │           └── route.ts    ← Claude AI suggestions (Phase 2)
│   │
│   ├── middleware.ts            ← session cookie handling (profile picker)
│   │
│   ├── components/             ← shared React components
│   │   ├── ui/                 ← generic: Button, Card, Input, Modal, Tag
│   │   ├── Navbar.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── PhotoUpload.tsx
│   │   ├── SearchBar.tsx
│   │   └── ProfilePicker.tsx
│   │
│   ├── lib/                    ← shared utilities
│   │   ├── db.ts               ← Prisma client singleton
│   │   ├── ingredients.ts      ← parser + category lookup (port of helpers.py)
│   │   ├── scraper.ts          ← recipe scraping (port of scraper.py)
│   │   ├── grocery.ts          ← grocery list aggregation
│   │   ├── photos.ts           ← upload + thumbnail generation (sharp)
│   │   └── auth.ts             ← session/cookie management
│   │
│   └── types/
│       └── index.ts            ← TypeScript type definitions
│
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

### Modularity Principle

Each feature group `(recipes)`, `(meals)`, `(events)`, `(gifts)`, `(braindump)`, `(search)` is self-contained in a route group. Adding a new feature means creating a new folder — nothing else changes. Shared logic lives in `lib/`, shared UI in `components/`.

---

## 4. Database Schema (Prisma)

### Existing Tables (14 — direct port)

All existing tables are preserved with identical relationships. Column naming changes from snake_case to camelCase (Prisma convention). The `@@map` directive maps Prisma model names to the original table names if needed.

**Core Recipe Models:**
- **Recipe** — id, title, description, prepTime, cookTime, servings, source, steps (JSON array of strings, e.g. `["Step 1 text", "Step 2 text"]`), createdAt
- **Ingredient** — id, recipeId (FK), quantity, unit, name, category, sortOrder
- **Tag** — id, name
- **RecipeTag** — recipeId (FK), tagId (FK) — many-to-many junction
- **Photo** — id, recipeId (FK), filename, caption, isPrimary, createdAt
- **Note** — id, recipeId (FK), content, createdAt, updatedAt

**Meal Plan Models:**
- **MealPlan** — id, name, type (weekly|event), eventDate, eventTime, createdAt
- **MealPlanItem** — id, mealPlanId (FK), recipeId (FK, nullable), freeText, slotLabel, servings, sortOrder
- **MealPlanDayNote** — id, mealPlanId (FK), day, content

**Event Models (extensions of MealPlan):**
- **EventNote** — id, mealPlanId (FK), content, createdAt
- **EventPhoto** — id, mealPlanId (FK), filename, caption, createdAt
- **EventInvitee** — id, mealPlanId (FK), name, rsvp (pending|attending|not_attending), dietaryNotes

**Gift Models:**
- **GiftHamper** — id, title, giftDate, createdAt
- **GiftHamperItem** — id, hamperId (FK), description, checked, note, sortOrder
- **GiftPhoto** — id, hamperId (FK), filename, caption, createdAt

**Other:**
- **Braindump** — id, content, createdAt

### New Tables (2)

- **User** — id, name, avatarFilename (nullable), createdAt
- **CookingLog** — id, userId (FK), recipeId (FK), cookedAt

### Cascade Deletes

All child records cascade on parent deletion (same as current schema):
- Deleting a Recipe removes its Ingredients, Photos, Notes, RecipeTags
- Deleting a MealPlan removes its Items, DayNotes, EventNotes, EventPhotos, EventInvitees
- Deleting a GiftHamper removes its Items and Photos

### Data Migration

A one-time migration script (`scripts/migrate-data.ts`) will:
1. Read from the existing SQLite database (`resources/kitchen-organiser-privatedata/recipes.db`)
2. Transform column names (snake_case → camelCase)
3. Insert into the new Prisma-managed database
4. Copy photos from `resources/kitchen-organiser-privatedata/photos/` to `public/photos/`
5. Original files are read-only — never modified

**Current data volume:** 24 recipes, 239 ingredients, 46 tags, 6 meal plans, 6 gift hampers, ~16MB photos.

---

## 5. Authentication & User System

**Approach: Netflix-style profile picker (no passwords)**

Rationale: Local network app behind VPN. Two users. Passwords add friction with zero security benefit.

**Flow:**
1. First visit (no session cookie) → profile selection screen
2. User clicks their name/avatar → cookie set with userId
3. All subsequent requests include the session cookie
4. Avatar circle in nav shows current user, click to switch profiles
5. Cookie managed via Next.js middleware (`src/middleware.ts`)

**User Profiles:**
- Jennifer and Matus (pre-seeded)
- Custom avatar photo upload supported (stored in `public/avatars/`)
- User model has optional `avatarFilename` field

**What's user-scoped:**
- CookingLog (who cooked what, when)
- Future: AI suggestion history and preferences

**What's shared (household collection):**
- All recipes, meal plans, events, gifts, brain dump entries

**Upgrade path:** Adding password auth later requires only adding a `passwordHash` field to User and a login form.

---

## 6. Feature Parity Map

Every existing feature must be replicated. Here is the complete mapping:

### Recipe Management
| Current (Flask) | New (Next.js) |
|----------------|---------------|
| `GET /` dashboard | `app/page.tsx` |
| `GET /recipes` list + search + tag filter | `app/(recipes)/recipes/page.tsx` |
| `POST /recipe/import` scrape URL | `app/api/scraper/route.ts` + Server Action |
| `GET /recipe/new` + `POST` create | `app/(recipes)/recipes/new/page.tsx` + Server Action |
| `GET /recipe/<id>` detail | `app/(recipes)/recipes/[id]/page.tsx` |
| `GET /recipe/<id>/edit` + `POST` update | `app/(recipes)/recipes/[id]/edit/page.tsx` + Server Action |
| `POST /recipe/<id>/delete` | Server Action with redirect |
| `POST /recipe/<id>/photo` upload | `app/api/upload/route.ts` |
| `POST /photo/<id>/primary` | Server Action |
| `POST /photo/<id>/delete` | Server Action |
| `POST /recipe/<id>/note` add | Server Action |
| `POST /note/<id>/edit` | Server Action |
| `POST /note/<id>/delete` | Server Action |

### Ingredient Search
| Current | New |
|---------|-----|
| `GET/POST /search` "What Can I Make?" | `app/(search)/search/page.tsx` |
| `search_by_ingredients()` helper | `lib/ingredients.ts` → `searchByIngredients()` |

### Meal Plans
| Current | New |
|---------|-----|
| `GET /meal-plans` list | `app/(meals)/meal-plans/page.tsx` |
| `GET /plan/new` + `POST` create | `app/(meals)/meal-plans/new/page.tsx` + Server Action |
| `GET /plan/<id>` detail | `app/(meals)/meal-plans/[id]/page.tsx` |
| `GET /plan/<id>/edit` + `POST` | `app/(meals)/meal-plans/[id]/edit/page.tsx` + Server Action |
| `POST /plan/<id>/delete` | Server Action |
| `POST /plan/<id>/add-item` | Server Action |
| `POST /plan/item/<id>/delete` | Server Action |
| `POST /plan/<id>/day-note` | Server Action |
| `GET /plan/<id>/grocery` | `app/(meals)/meal-plans/[id]/grocery/page.tsx` |

### Event Plans
| Current | New |
|---------|-----|
| `GET /event-plans` list | `app/(events)/event-plans/page.tsx` |
| Event detail (shared with meal plan) | `app/(events)/event-plans/[id]/page.tsx` |
| `POST /plan/<id>/invitee` add guest | Server Action |
| `POST /invitee/<id>/update` RSVP | Server Action |
| `POST /invitee/<id>/delete` | Server Action |
| `POST /plan/<id>/event-note` | Server Action |
| `POST /plan/<id>/photo` event photo | Server Action + upload API |

### Gifts
| Current | New |
|---------|-----|
| `GET /gifts` list | `app/(gifts)/gifts/page.tsx` |
| `GET /gift/<id>` detail | `app/(gifts)/gifts/[id]/page.tsx` |
| `POST /gift/new` create | Server Action |
| `POST /gift/<id>/add-item` | Server Action |
| `POST /gift/item/<id>/toggle` check/uncheck | Server Action |
| `POST /gift/item/<id>/note` | Server Action |
| `POST /gift/item/<id>/delete` | Server Action |
| `POST /gift/<id>/photo` | Server Action + upload API |
| `POST /gift/<id>/delete` | Server Action |

### Brain Dump
| Current | New |
|---------|-----|
| `GET /braindump` | `app/(braindump)/braindump/page.tsx` |
| `POST /braindump/add` | Server Action |
| `POST /braindump/<id>/delete` | Server Action |

### API
| Current | New |
|---------|-----|
| `GET /api/recipes` JSON search | `app/api/recipes/route.ts` |

---

## 7. UI Design

### Design System

**Color Palette (Tailwind config):**
```
bg:           #faf8f6    (warm off-white)
surface:      #f5efe8    (warm light tan)
card:         #ffffff    (white)
border:       #ece7e1    (light tan)
accent:       #c69f73    (warm brown — primary)
accent-hover: #b08a5f    (darker brown)
text:         #2c2c2c    (near-black)
text-light:   #8a8078    (warm gray)
```

**Typography:**
- Headings: Cormorant Garamond (serif) — loaded via Google Fonts
- Body: Inter (sans-serif) — loaded via Google Fonts
- Both loaded via `next/font` for optimal performance

**Design Tokens:**
- Border radius: 12px (cards), 8px (inputs, tags), 20px (tag pills)
- Spacing: generous whitespace, 2rem section padding
- Shadows: subtle (`0 4px 24px rgba(0,0,0,0.06)`)

### Key UI Patterns

**Desktop:**
- Sticky top navigation with uppercase links, underline active state
- User avatar circle (initials or custom photo) in nav, click to switch profiles
- Dashboard: personalized greeting, AI suggestion card, stats row, recent recipe grid
- Recipe grid: 3-column card layout with thumbnail, tags, title, description, meta
- Recipe detail: hero section (photo + metadata), two-column ingredients/steps
- Forms: clean inputs with warm border tones

**Mobile:**
- Bottom tab navigation (Home, Recipes, Plans, Gifts) — thumb-friendly
- Hamburger menu for less-used items
- Recipe cards stack vertically (horizontal layout: thumbnail left, info right)
- Recipe detail optimized for cooking: large text, clear numbered steps
- AI suggestion input prominent on dashboard

**Responsive breakpoints:**
- Mobile: default (< 768px)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)

---

## 8. Recipe Scraper

Port of the existing Python scraper to TypeScript.

**Libraries:**
- `cheerio` (replaces BeautifulSoup4) — HTML parsing
- Built-in `fetch` (replaces requests) — HTTP fetching

**Capabilities (identical to current):**
1. **Schema.org JSON-LD scraping** — extract Recipe structured data from websites
   - Maps: title, description, prepTime, cookTime, servings, ingredients, instructions, keywords, image
   - ISO 8601 duration parsing (PT1H30M → 90 minutes)
   - Handles HowToStep and HowToSection instruction formats
2. **YouTube scraping** — extract recipe from video description
   - Detects YouTube URLs (youtube.com, youtu.be, shorts)
   - Parses description for ingredient/instruction sections
   - Downloads video thumbnail
3. **Image download** — fetches recipe image, generates thumbnail via sharp

**Location:** `src/lib/scraper.ts`

---

## 9. Photo Handling

**Processing pipeline (using sharp):**
1. Receive uploaded file via API route (`app/api/upload/route.ts`)
2. Generate UUID filename: `{uuid}.{ext}`
3. Auto-rotate based on EXIF orientation
4. Save full-size image to `public/photos/`
5. Generate 400×400 thumbnail (fit-within-bounds, preserving aspect ratio): `thumb_{uuid}.{ext}`
6. Return filename for database storage

**Supported formats:** jpg, jpeg, png, gif, webp

**Photo types:**
- Recipe photos → `public/photos/`
- Event photos → `public/photos/` (prefixed `event_`)
- Gift photos → `public/photos/` (prefixed `gift_`)
- User avatars → `public/avatars/`

---

## 10. AI Recipe Suggestions (Phase 2)

Architecture is prepared in Phase 1, implementation deferred.

**Endpoint:** `app/api/suggest/route.ts`

**How it works:**
1. Collect context: user's CookingLog (recent meals, frequency), all recipes in database, current season, time of day
2. Build structured prompt for Claude API
3. Call Claude API (Anthropic SDK for Node.js)
4. Return suggestion: recipe name, brief description, whether it matches an existing recipe or is a new idea
5. Display in the dashboard suggestion card

**Two modes:**
- **On-demand:** User types in the suggestion input ("I'm in the mood for something warm and Italian"), gets a personalized response
- **Proactive (optional):** Background job runs several times daily, caches fresh suggestions based on patterns

**Dashboard integration:**
- Prominent card at top of dashboard with input field
- Suggestions can link to existing recipes or inspire new ones

---

## 11. Deployment

### Development
```bash
npm run dev          # Next.js dev server with hot reload
npx prisma studio   # Visual database browser
npx prisma migrate dev  # Apply schema changes
```

### Production (Homelab Docker)

```yaml
# docker-compose.yml
services:
  kitchen-organiser:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data/recipes.db:/app/prisma/prod.db
      - ./data/photos:/app/public/photos
      - ./data/avatars:/app/public/avatars
    environment:
      - DATABASE_URL=file:/app/prisma/prod.db
      - NODE_ENV=production
    restart: unless-stopped
```

**Key points:**
- Single container, single service
- SQLite database and photos stored in Docker volumes (persist across container rebuilds)
- Accessible at `http://<homelab-ip>:3000`
- `restart: unless-stopped` for crash recovery (replaces launchd)
- Upgrading: `docker compose build && docker compose up -d`

### Backup
Same strategy as current `backup.sh` — copy the database file and photos directory. Update paths to point at the Docker volume mount locations.

---

## 12. Decisions Log

Key decisions made during brainstorming and their rationale:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 (App Router) | One project, largest ecosystem, SSR for mobile, file-based routing |
| Over Vite+Express | — | Two deployments, CORS, no SSR — more operational overhead |
| Over Remix | — | Smaller community, ecosystem in transition |
| Database | SQLite via Prisma | 2 users, infrequent writes, zero maintenance, backup = copy file |
| Over PostgreSQL | — | Overkill for 2 users; Prisma makes migration trivial if ever needed |
| Auth | Profile picker (no passwords) | Local network behind VPN; passwords add friction, zero security benefit |
| Styling | Tailwind CSS | Utility-first, responsive prefixes, custom palette, fast development |
| Typography | Keep Cormorant Garamond + Inter | User likes current fonts, just modernize execution |
| Color palette | Refined version of current earthy tones | User explicitly wants to keep the aesthetic |
| Mobile | Bottom tab bar + mobile-first Tailwind | Primary use: cooking with phone in hand |
| Avatars | Custom photo upload | Jennifer and Matus want "funny avatars" |
| AI features | Phase 2 (architecture ready) | Stubbed route, needs CookingLog data to be useful |
| Deployment | Docker + docker-compose | Homelab server, volumes for data, easy updates |

---

## 13. Migration Checklist

Before the new app can replace the old one:

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
- [ ] Backup strategy validated

---

## Appendix A: Existing App Reference

**Source code:** `resources/the-kitchen-organiser/`
**Private data:** `resources/kitchen-organiser-privatedata/`

Key files in existing app:
- `app.py` — ~1300 lines, all Flask routes and logic
- `helpers.py` — ingredient parsing, grocery aggregation, category detection
- `scraper.py` — Schema.org and YouTube recipe scraping
- `schema.sql` — database schema (14 tables)
- `seed.py` — 5 sample recipes
- `static/style.css` — all CSS (custom properties for colors)
- `templates/` — 13 Jinja2 HTML templates

**Current data:**
- 24 recipes, 239 ingredients, 46 tags, 67 tag-recipe relationships
- 24 recipe photos, 2 event photos, 1 gift photo
- 6 meal plans (mostly event type), 66 meal plan items, 16 invitees
- 6 gift hampers, 20 gift items
- 9 recipe notes, 6 event notes, 1 braindump entry
- Total photo storage: ~16MB
