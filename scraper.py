"""Scrape recipe data from URLs (recipe websites and YouTube videos)."""

import json
import os
import re
import uuid
from html import unescape

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
}
REQUEST_TIMEOUT = 10
THUMB_SIZE = (400, 400)


def scrape_url(url, photo_dir):
    """Scrape a recipe from the given URL.

    Returns a dict with keys: title, description, prep_time, cook_time,
    servings, source, ingredients, steps, tags, image_filename.
    """
    url = url.strip()
    if not url:
        raise ValueError('URL is required.')

    if _is_youtube_url(url):
        return _scrape_youtube(url, photo_dir)
    else:
        return _scrape_recipe_site(url, photo_dir)


# ── YouTube ──────────────────────────────────────────────────────────────────

_YT_PATTERNS = [
    re.compile(r'(?:youtube\.com/watch\?.*v=|youtu\.be/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})'),
]


def _is_youtube_url(url):
    return any(p.search(url) for p in _YT_PATTERNS)


def _extract_video_id(url):
    for p in _YT_PATTERNS:
        m = p.search(url)
        if m:
            return m.group(1)
    return None


def _scrape_youtube(url, photo_dir):
    video_id = _extract_video_id(url)
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, 'html.parser')

    # Extract title from meta tags
    title = ''
    og_title = soup.find('meta', property='og:title')
    if og_title:
        title = og_title.get('content', '')
    if not title:
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().replace(' - YouTube', '').strip()

    # Extract description from meta tags
    description_text = ''
    og_desc = soup.find('meta', property='og:description')
    if og_desc:
        description_text = og_desc.get('content', '')

    # Also try to get full description from page script data
    full_desc = _extract_youtube_full_description(resp.text)
    if full_desc and len(full_desc) > len(description_text):
        description_text = full_desc

    # Parse recipe from description
    ingredients, steps, desc_short = _parse_youtube_description(description_text)

    # Download thumbnail
    image_filename = None
    if video_id:
        image_filename = _download_youtube_thumbnail(video_id, photo_dir)

    return {
        'title': _clean_text(title),
        'description': _clean_text(desc_short),
        'prep_time': None,
        'cook_time': None,
        'servings': None,
        'source': url,
        'ingredients': ingredients,
        'steps': steps,
        'tags': [],
        'image_filename': image_filename,
    }


def _extract_youtube_full_description(html_text):
    """Try to extract the full video description from YouTube's embedded JSON."""
    # YouTube embeds video data in a script as ytInitialData or ytInitialPlayerResponse
    patterns = [
        r'"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"',
        r'"description"\s*:\s*\{\s*"simpleText"\s*:\s*"((?:[^"\\]|\\.)*)"',
    ]
    for pattern in patterns:
        m = re.search(pattern, html_text)
        if m:
            text = m.group(1)
            # Unescape JSON string escapes
            text = text.replace('\\n', '\n').replace('\\t', '\t')
            text = text.replace('\\"', '"').replace('\\\\', '\\')
            return text
    return None


_INGREDIENT_HEADERS = re.compile(
    r'^(?:ingredients?|what you\'?ll? need|you\'?ll? need|shopping list)\s*[:.]?\s*$',
    re.IGNORECASE
)
_STEP_HEADERS = re.compile(
    r'^(?:instructions?|method|directions?|steps?|how to make(?: it)?|preparation)\s*[:.]?\s*$',
    re.IGNORECASE
)
_TIMESTAMP_LINE = re.compile(r'^\d{1,2}:\d{2}')


def _parse_youtube_description(text):
    """Parse a YouTube description for recipe ingredients and steps.

    Returns (ingredients, steps, short_description).
    """
    if not text:
        return [], [], ''

    lines = [line.strip() for line in text.split('\n')]

    # Find ingredient and step sections
    ingredient_start = None
    step_start = None
    section_ends = {}

    for i, line in enumerate(lines):
        if _TIMESTAMP_LINE.match(line):
            continue
        if _INGREDIENT_HEADERS.match(line):
            ingredient_start = i + 1
        elif _STEP_HEADERS.match(line):
            if ingredient_start is not None and 'ingredients' not in section_ends:
                section_ends['ingredients'] = i
            step_start = i + 1

    ingredients = []
    steps = []
    short_description = ''

    if ingredient_start is not None:
        end = section_ends.get('ingredients', step_start or len(lines))
        for line in lines[ingredient_start:end]:
            line = line.strip().lstrip('•-●◦▪★☆✓✔·').strip()
            if line and not _TIMESTAMP_LINE.match(line) and not _STEP_HEADERS.match(line):
                ingredients.append(line)

    if step_start is not None:
        for line in lines[step_start:]:
            line = line.strip().lstrip('•-●◦▪★☆✓✔·').strip()
            # Stop at empty line followed by non-step content (links, etc.)
            if not line:
                continue
            if line.startswith('http') or line.startswith('www.'):
                break
            # Strip leading step numbers like "1." or "1)"
            line = re.sub(r'^\d+[.)]\s*', '', line)
            if line:
                steps.append(line)

    # Short description is everything before the first recipe section
    first_section = min(
        x for x in [ingredient_start, step_start, len(lines)] if x is not None
    )
    desc_lines = [l for l in lines[:max(0, first_section - 1)]
                  if l and not _TIMESTAMP_LINE.match(l)]
    short_description = ' '.join(desc_lines[:3])  # First few lines

    return ingredients, steps, short_description


def _download_youtube_thumbnail(video_id, photo_dir):
    """Download a YouTube video thumbnail."""
    for quality in ('maxresdefault', 'hqdefault'):
        url = f'https://img.youtube.com/vi/{video_id}/{quality}.jpg'
        try:
            resp = requests.get(url, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 200 and len(resp.content) > 1000:
                return _save_image(resp.content, photo_dir, '.jpg')
        except requests.RequestException:
            continue
    return None


# ── Recipe Websites (Schema.org) ─────────────────────────────────────────────

def _scrape_recipe_site(url, photo_dir):
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, 'html.parser')
    recipe_data = _extract_schema_recipe(soup)

    if not recipe_data:
        raise ValueError('No recipe data found at this URL.')

    # Map fields
    title = recipe_data.get('name', '')
    description = recipe_data.get('description', '')

    prep_time = parse_iso_duration(recipe_data.get('prepTime'))
    cook_time = parse_iso_duration(recipe_data.get('cookTime'))
    servings = _parse_servings(recipe_data.get('recipeYield'))

    ingredients = _extract_ingredients(recipe_data)
    steps = _extract_steps(recipe_data)
    tags = _extract_tags(recipe_data)

    # Download image
    image_filename = None
    image_url = _extract_image_url(recipe_data)
    if image_url:
        image_filename = _download_image(image_url, photo_dir)

    return {
        'title': _clean_text(title),
        'description': _clean_text(description),
        'prep_time': prep_time,
        'cook_time': cook_time,
        'servings': servings,
        'source': url,
        'ingredients': ingredients,
        'steps': steps,
        'tags': tags,
        'image_filename': image_filename,
    }


def _extract_schema_recipe(soup):
    """Find a Schema.org Recipe object from JSON-LD scripts."""
    scripts = soup.find_all('script', type='application/ld+json')
    for script in scripts:
        try:
            data = json.loads(script.string)
        except (json.JSONDecodeError, TypeError):
            continue

        recipe = _find_recipe_in_schema(data)
        if recipe:
            return recipe
    return None


def _find_recipe_in_schema(data):
    """Recursively search for a Recipe type in Schema.org data."""
    if isinstance(data, dict):
        schema_type = data.get('@type', '')
        # @type can be a string or a list
        if isinstance(schema_type, list):
            types = schema_type
        else:
            types = [schema_type]
        if 'Recipe' in types:
            return data
        # Search in @graph
        if '@graph' in data:
            return _find_recipe_in_schema(data['@graph'])
    elif isinstance(data, list):
        for item in data:
            result = _find_recipe_in_schema(item)
            if result:
                return result
    return None


def _extract_ingredients(recipe_data):
    """Extract ingredient lines from Schema.org recipe data."""
    ingredients = recipe_data.get('recipeIngredient', [])
    if isinstance(ingredients, str):
        ingredients = [ingredients]
    return [_clean_text(ing) for ing in ingredients if ing]


def _extract_steps(recipe_data):
    """Extract step text from Schema.org recipeInstructions.

    Handles: plain string, list of strings, list of HowToStep,
    list of HowToSection containing HowToStep items.
    """
    instructions = recipe_data.get('recipeInstructions', [])

    if isinstance(instructions, str):
        # Single string — split on newlines or numbered steps
        lines = re.split(r'\n+|\.\s+(?=\d)', instructions)
        return [_clean_text(line) for line in lines if line.strip()]

    steps = []
    for item in instructions:
        if isinstance(item, str):
            steps.append(_clean_text(item))
        elif isinstance(item, dict):
            item_type = item.get('@type', '')
            if item_type == 'HowToStep':
                steps.append(_clean_text(item.get('text', '')))
            elif item_type == 'HowToSection':
                # Flatten section: add section name as a header, then its steps
                section_name = item.get('name', '')
                if section_name:
                    steps.append(f'** {section_name} **')
                for sub_item in item.get('itemListElement', []):
                    if isinstance(sub_item, dict):
                        steps.append(_clean_text(sub_item.get('text', '')))
                    elif isinstance(sub_item, str):
                        steps.append(_clean_text(sub_item))
    return [s for s in steps if s]


def _extract_tags(recipe_data):
    """Extract tags from recipeCategory and keywords."""
    tags = []
    category = recipe_data.get('recipeCategory')
    if isinstance(category, str):
        tags.extend(t.strip().lower() for t in category.split(',') if t.strip())
    elif isinstance(category, list):
        tags.extend(t.strip().lower() for t in category if t.strip())

    keywords = recipe_data.get('keywords')
    if isinstance(keywords, str):
        tags.extend(t.strip().lower() for t in keywords.split(',') if t.strip())
    elif isinstance(keywords, list):
        tags.extend(t.strip().lower() for t in keywords if t.strip())

    # Deduplicate while preserving order
    seen = set()
    unique_tags = []
    for tag in tags:
        if tag not in seen:
            seen.add(tag)
            unique_tags.append(tag)
    return unique_tags


def _extract_image_url(recipe_data):
    """Extract the first image URL from Schema.org image field."""
    image = recipe_data.get('image')
    if not image:
        return None
    if isinstance(image, str):
        return image
    if isinstance(image, dict):
        return image.get('url')
    if isinstance(image, list):
        first = image[0] if image else None
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return first.get('url')
    return None


def _parse_servings(yield_val):
    """Extract a numeric servings value from recipeYield."""
    if yield_val is None:
        return None
    if isinstance(yield_val, (int, float)):
        return int(yield_val)
    if isinstance(yield_val, list):
        yield_val = yield_val[0] if yield_val else None
    if isinstance(yield_val, str):
        m = re.search(r'\d+', yield_val)
        if m:
            return int(m.group())
    return None


# ── Shared Helpers ───────────────────────────────────────────────────────────

def parse_iso_duration(duration):
    """Convert ISO 8601 duration (e.g. 'PT1H30M') to minutes.

    Handles: PT30M, PT1H, PT1H30M, PT1H30M15S, P0DT1H, etc.
    Returns None if the string is not a valid duration.
    """
    if not duration or not isinstance(duration, str):
        return None

    m = re.match(
        r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?',
        duration.strip()
    )
    if not m:
        return None

    days = int(m.group(1) or 0)
    hours = int(m.group(2) or 0)
    minutes = int(m.group(3) or 0)
    # Ignore seconds for recipe purposes

    total = days * 24 * 60 + hours * 60 + minutes
    return total if total > 0 else None


def _download_image(url, photo_dir):
    """Download an image from a URL and save it with a thumbnail."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        content_type = resp.headers.get('Content-Type', '')
        if 'image' not in content_type and not url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            return None

        # Determine extension
        if 'png' in content_type or url.lower().endswith('.png'):
            ext = '.png'
        elif 'webp' in content_type or url.lower().endswith('.webp'):
            ext = '.webp'
        else:
            ext = '.jpg'

        return _save_image(resp.content, photo_dir, ext)
    except requests.RequestException:
        return None


def _save_image(image_bytes, photo_dir, ext):
    """Save image bytes to disk and generate a thumbnail. Returns filename."""
    filename = f'{uuid.uuid4().hex}{ext}'
    filepath = os.path.join(photo_dir, filename)

    with open(filepath, 'wb') as f:
        f.write(image_bytes)

    # Generate thumbnail using the same logic as the app
    try:
        img = Image.open(filepath)
        img = ImageOps.exif_transpose(img)
        img.save(filepath)
        thumb = img.copy()
        thumb.thumbnail(THUMB_SIZE)
        thumb_path = os.path.join(photo_dir, f'thumb_{filename}')
        thumb.save(thumb_path)
    except Exception:
        pass  # Keep the image even if thumbnail fails

    return filename


def _clean_text(text):
    """Strip HTML tags and decode entities from scraped text."""
    if not text:
        return ''
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', str(text))
    # Decode HTML entities
    text = unescape(text)
    return text.strip()
