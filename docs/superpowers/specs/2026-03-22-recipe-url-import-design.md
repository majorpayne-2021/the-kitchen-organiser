# Recipe URL Import — Design Spec

## Summary

Add a feature that lets the user paste a URL from a recipe website or YouTube video, scrape the recipe data (title, description, ingredients, steps, times, photo), and pre-fill the existing recipe form for review before saving.

## Motivation

Currently, adding a recipe requires manual data entry. Most recipe websites embed structured Schema.org JSON-LD data, and YouTube recipe videos include the recipe in the video description. Automating extraction from these sources saves significant time while the preview-then-save flow lets the user correct any parsing issues before committing to the database.

## Supported Sources

### Recipe Websites (e.g. RecipeTinEats)

- Fetch the page HTML via `requests`
- Parse with `beautifulsoup4` to extract `<script type="application/ld+json">` blocks
- Find the `Recipe` schema object and map fields to the app's data model
- Download the recipe image and generate a thumbnail

### YouTube Videos

- Detect YouTube URLs (`youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/`)
- Fetch the page HTML and extract the video description
- Parse the description heuristically for recipe content: look for section headers (case-insensitive) like "Ingredients", "INGREDIENTS", "What you need", "Instructions", "Method", "Directions", etc. Skip timestamp lines. If no headers found, treat the full description as unstructured text and pre-fill only title + source.
- Extract the video title as the recipe title
- Download the video thumbnail from `https://img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg` (fall back to `hqdefault.jpg`)

## Data Mapping

| Source Field | App Field | Notes |
|---|---|---|
| `name` / video title | `title` | |
| `description` | `description` | |
| `prepTime` (ISO 8601) | `prep_time` | Converted to minutes via new `parse_iso_duration()` |
| `cookTime` (ISO 8601) | `cook_time` | Converted to minutes via new `parse_iso_duration()` |
| `recipeYield` | `servings` | Extract first integer found (handles "4 servings", "Makes 12", etc.) |
| `recipeCategory` / `keywords` | tags | Optional: map to tags for pre-filling |
| `recipeIngredient[]` / description lines | ingredients | Passed through existing `parse_ingredient()` |
| `recipeInstructions[]` / description lines | `steps` | Extract `text` from `HowToStep` objects; flatten `HowToSection` groups; handle plain string and string array formats |
| `image` / YouTube thumbnail | photo | Handle URL string, `ImageObject.url`, or array formats. Downloaded, thumbnailed via existing Pillow pipeline |
| Source URL | `source` | Stored as-is |

## Architecture

### New File: `scraper.py`

Contains all scraping logic, isolated from Flask routes:

- `scrape_url(url: str) -> dict` — entry point, auto-detects source type and delegates
- `scrape_recipe_site(url: str) -> dict` — Schema.org JSON-LD extraction (searches top-level and `@graph` arrays for `Recipe` type)
- `scrape_youtube(url: str) -> dict` — YouTube description parsing
- `parse_iso_duration(duration: str) -> int | None` — converts `PT1H30M` to `90`
- `download_image(url: str, dest_dir: str) -> str | None` — downloads image, generates thumbnail, returns filename

Return format (shared by both scrapers):

```python
{
    "title": str,
    "description": str,
    "prep_time": int | None,      # minutes
    "cook_time": int | None,      # minutes
    "servings": int | None,
    "source": str,                # original URL
    "ingredients": [str],         # raw lines, e.g. ["2 cups flour", "1 tsp salt"]
    "steps": [str],               # plain text steps
    "image_filename": str | None, # filename in static/photos/ (thumbnail also generated)
    "tags": [str],                # from recipeCategory/keywords (optional)
}
```

All scraped text fields are stripped of HTML tags and HTML entities are decoded.

### HTTP Requests

- All `requests.get()` calls use a 10-second timeout
- A browser-like `User-Agent` header is sent to avoid blocks from recipe sites

### Modified: `app.py`

Two new routes:

- `GET /recipe/import` — renders a simple form with a URL input
- `POST /recipe/import` — calls `scrape_url()`, stores scraped data in session, redirects to `/recipe/new?from_import=1`. The import form uses a standard form POST (not HTMX) since it triggers a full-page redirect.

Modified route:

- `GET /recipe/new` — when `from_import=1` query param is present, reads scraped data from session and pre-fills the form

### Modified: `templates/recipe_form.html`

- Pre-fill form fields from scraped data when provided
- Show the downloaded image preview if one was scraped
- Include a hidden `imported_photo` field with the image filename
- Add an "Import from URL" button/link accessible from the recipe list or the empty new-recipe form

### Photo Lifecycle

1. `scrape_url()` downloads the image to `static/photos/` and generates a `thumb_` thumbnail using the existing Pillow pipeline
2. The filename is stored in the session alongside other scraped data
3. The recipe form includes a hidden `imported_photo` field with the filename
4. `save_recipe()` is modified to check for this hidden field and insert a `photo` table row (marked as primary)
5. If the user abandons the form, the orphaned image file remains in `static/photos/` — acceptable for a single-user local app

### Modified: `helpers.py`

- Add `parse_iso_duration(duration: str) -> int | None` if it fits better here than in `scraper.py` (duration parsing is a general utility)

### Modified: `environment.yml`

- Add `requests` and `beautifulsoup4` dependencies

## User Flow

1. User clicks "Import from URL" (from recipe list or new recipe form)
2. Sees a simple form with a URL input and "Import" button
3. Pastes a URL (e.g. `https://www.recipetineats.com/...` or `https://youtube.com/watch?v=...`)
4. App scrapes the URL, extracts recipe data, downloads image + generates thumbnail
5. Redirects to the recipe form pre-filled with all extracted data
6. User reviews, edits if needed, and saves as normal

## Error Handling

| Scenario | Behavior |
|---|---|
| Invalid/empty URL | Flash error, stay on import form |
| Network failure (timeout, DNS, etc.) | Flash error with details, stay on import form |
| No Schema.org Recipe data found | Flash warning "No recipe data found at this URL", stay on import form |
| YouTube video with no recipe in description | Flash warning, pre-fill with just title + source URL |
| Image download fails | Proceed without image, flash note |
| Partial data (e.g. no prep time) | Pre-fill what's available, leave rest blank |

## Dependencies

- `requests` — HTTP fetching (lightweight, no headless browser)
- `beautifulsoup4` — HTML parsing for JSON-LD extraction and YouTube description

## Out of Scope

- AI/LLM-based recipe extraction
- Video/audio transcription
- Background job processing (scraping is synchronous)
- Batch URL import
- Automatic saving without preview
