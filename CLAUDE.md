# Kitchen Organiser — Rebuild Project

## What This Project Is

A full rebuild of a household kitchen management app from Flask/Python to Next.js/React/TypeScript. The original app lives in `resources/the-kitchen-organiser/` and its data in `resources/kitchen-organiser-privatedata/`. The new app will be built in the project root.

## Design Spec

The approved design spec is at `docs/superpowers/specs/2026-03-24-kitchen-organiser-rebuild-design.md`. Read it before making any architectural decisions — it contains every decision from the brainstorming session with the user.

## Key Context

- **Users:** Jennifer and Matus (a couple). Two-person household. Netflix-style profile picker, no passwords.
- **Deployment:** Docker on a homelab. Local network access only (VPN for remote). No HTTPS needed.
- **Database:** SQLite via Prisma ORM. The existing database has 24 recipes, ~16MB of photos. Migration script needed.
- **Design:** Earthy tones (warm browns, off-whites), Cormorant Garamond + Inter fonts. Keep the current aesthetic, just modernize layout and spacing. User explicitly said "keep everything, make it fresher."
- **Custom avatars:** Jennifer and Matus want to upload their own "funny" avatar photos.
- **AI suggestions (Phase 2):** Claude API integration for recipe suggestions based on cooking history. Architecture should be ready (stubbed route at `api/suggest/`) but not implemented yet.
- **Mobile-first:** Primary use case is cooking with phone in hand. Bottom tab navigation on mobile.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS with custom earthy palette
- Prisma ORM + SQLite
- sharp for image processing
- cheerio for recipe scraping
- Docker + docker-compose for deployment

## Project Structure

Feature-based route groups: `(recipes)`, `(meals)`, `(events)`, `(gifts)`, `(braindump)`, `(search)`. Each is self-contained. Shared logic in `src/lib/`, shared components in `src/components/`. See the spec for full file tree.

## Important Files in the Original App

- `resources/the-kitchen-organiser/app.py` — all Flask routes (~1300 lines, ~40 routes)
- `resources/the-kitchen-organiser/helpers.py` — ingredient parsing, grocery aggregation
- `resources/the-kitchen-organiser/scraper.py` — Schema.org + YouTube scraping
- `resources/the-kitchen-organiser/schema.sql` — database schema (14 tables)
- `resources/the-kitchen-organiser/static/style.css` — current CSS (color palette reference)
- `resources/kitchen-organiser-privatedata/recipes.db` — real data to migrate
- `resources/kitchen-organiser-privatedata/photos/` — real photos to copy

## Conventions

- Use Server Actions for form submissions (not API routes) — they replace Flask POST routes
- Use React Server Components by default; add `"use client"` only when interactivity is needed
- Prisma camelCase field names mapping to the existing schema's snake_case columns
- Photo naming: `{uuid}.{ext}` with `thumb_{uuid}.{ext}` thumbnails (400x400)
- UUID-based photo filenames (same convention as existing app)

## What NOT To Do

- Do not add passwords or complex auth — this is a local household app
- Do not switch away from SQLite unless explicitly asked
- Do not redesign the color palette — user approved the current earthy tones
- Do not implement AI suggestions yet — only stub the route. It's Phase 2.
- Do not delete or modify files in `resources/` — those are reference/source material

## Commands

```bash
npm run dev              # Development server
npx prisma migrate dev   # Apply schema changes
npx prisma studio        # Visual database browser
npx prisma db seed       # Seed data
npm run build            # Production build
docker compose up -d     # Production deployment
```

## Learning Mode

The user is new to Node.js/React/Next.js (experienced with Python/Flask). Provide educational explanations with Insight blocks when introducing new concepts. Frame Next.js patterns in terms of Flask equivalents where helpful.
