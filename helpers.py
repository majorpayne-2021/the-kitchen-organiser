"""Ingredient parsing, grocery aggregation, and search helpers."""

import re
from collections import defaultdict

# Common units for parsing ingredient lines
UNITS = [
    'tablespoons', 'tablespoon', 'tbsp', 'tbs',
    'teaspoons', 'teaspoon', 'tsp',
    'cups', 'cup',
    'ounces', 'ounce', 'oz',
    'pounds', 'pound', 'lbs', 'lb',
    'grams', 'gram', 'g',
    'kilograms', 'kilogram', 'kg',
    'milliliters', 'milliliter', 'ml',
    'liters', 'liter', 'l',
    'pinch', 'pinches',
    'dash', 'dashes',
    'cloves', 'clove',
    'cans', 'can',
    'packages', 'package', 'pkg',
    'slices', 'slice',
    'pieces', 'piece',
    'bunches', 'bunch',
    'sprigs', 'sprig',
    'stalks', 'stalk',
    'heads', 'head',
    'whole',
    'large', 'medium', 'small',
]

# Category lookup for common grocery items
CATEGORY_LOOKUP = {
    'apple': 'produce', 'avocado': 'produce', 'banana': 'produce',
    'basil': 'produce', 'bell pepper': 'produce', 'broccoli': 'produce',
    'carrot': 'produce', 'celery': 'produce', 'cilantro': 'produce',
    'corn': 'produce', 'cucumber': 'produce', 'garlic': 'produce',
    'ginger': 'produce', 'green onion': 'produce', 'jalapeño': 'produce',
    'kale': 'produce', 'lemon': 'produce', 'lettuce': 'produce',
    'lime': 'produce', 'mango': 'produce', 'mushroom': 'produce',
    'onion': 'produce', 'orange': 'produce', 'parsley': 'produce',
    'pea': 'produce', 'pepper': 'produce', 'potato': 'produce',
    'rosemary': 'produce', 'scallion': 'produce', 'shallot': 'produce',
    'spinach': 'produce', 'squash': 'produce', 'strawberry': 'produce',
    'thyme': 'produce', 'tomato': 'produce', 'zucchini': 'produce',

    'butter': 'dairy', 'cheese': 'dairy', 'cream': 'dairy',
    'cream cheese': 'dairy', 'egg': 'dairy', 'eggs': 'dairy',
    'half and half': 'dairy', 'milk': 'dairy', 'parmesan': 'dairy',
    'sour cream': 'dairy', 'yogurt': 'dairy', 'mozzarella': 'dairy',
    'cheddar': 'dairy', 'ricotta': 'dairy', 'feta': 'dairy',
    'heavy cream': 'dairy', 'whipping cream': 'dairy',

    'bacon': 'meat', 'beef': 'meat', 'chicken': 'meat',
    'ground beef': 'meat', 'ground turkey': 'meat', 'ham': 'meat',
    'lamb': 'meat', 'pork': 'meat', 'sausage': 'meat',
    'steak': 'meat', 'turkey': 'meat',

    'cod': 'seafood', 'crab': 'seafood', 'halibut': 'seafood',
    'salmon': 'seafood', 'shrimp': 'seafood', 'tilapia': 'seafood',
    'tuna': 'seafood',

    'baking powder': 'pantry', 'baking soda': 'pantry',
    'black pepper': 'pantry', 'bread': 'pantry', 'brown sugar': 'pantry',
    'cayenne': 'pantry', 'chili powder': 'pantry', 'cinnamon': 'pantry',
    'cocoa powder': 'pantry', 'coconut milk': 'pantry',
    'cornstarch': 'pantry', 'cumin': 'pantry', 'flour': 'pantry',
    'honey': 'pantry', 'ketchup': 'pantry', 'maple syrup': 'pantry',
    'mayonnaise': 'pantry', 'mustard': 'pantry', 'nutmeg': 'pantry',
    'oil': 'pantry', 'olive oil': 'pantry', 'oregano': 'pantry',
    'paprika': 'pantry', 'pasta': 'pantry', 'pepper': 'pantry',
    'red pepper flakes': 'pantry', 'rice': 'pantry', 'salt': 'pantry',
    'sesame oil': 'pantry', 'soy sauce': 'pantry', 'sugar': 'pantry',
    'tomato paste': 'pantry', 'tomato sauce': 'pantry',
    'vanilla': 'pantry', 'vanilla extract': 'pantry',
    'vegetable oil': 'pantry', 'vinegar': 'pantry',
    'worcestershire sauce': 'pantry', 'yeast': 'pantry',

    'bread crumbs': 'bakery', 'tortilla': 'bakery', 'pita': 'bakery',
    'naan': 'bakery', 'baguette': 'bakery',

    'beer': 'beverages', 'wine': 'beverages', 'broth': 'pantry',
    'chicken broth': 'pantry', 'beef broth': 'pantry',
    'vegetable broth': 'pantry', 'stock': 'pantry',
}

# Fraction unicode and text mappings
FRACTIONS = {
    '½': 0.5, '⅓': 1/3, '⅔': 2/3, '¼': 0.25, '¾': 0.75,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
    '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1/6, '⅚': 5/6,
}


def parse_fraction(s):
    """Parse a string that may contain fractions into a float."""
    s = s.strip()
    if not s:
        return None

    # Check for unicode fractions
    for frac_char, frac_val in FRACTIONS.items():
        if frac_char in s:
            parts = s.split(frac_char)
            whole = float(parts[0]) if parts[0].strip() else 0
            return whole + frac_val

    # Check for slash fractions like 1/2
    if '/' in s:
        parts = s.split()
        if len(parts) == 2 and '/' in parts[1]:
            # "1 1/2" format
            whole = float(parts[0])
            num, den = parts[1].split('/')
            return whole + float(num) / float(den)
        elif '/' in parts[0]:
            num, den = parts[0].split('/')
            return float(num) / float(den)

    try:
        return float(s)
    except ValueError:
        return None


def parse_ingredient(line):
    """Parse a free-text ingredient line into (quantity, unit, name).

    Examples:
        "2 cups flour" → (2.0, "cups", "flour")
        "1/2 tsp salt" → (0.5, "tsp", "salt")
        "3 large eggs" → (3.0, "large", "eggs")
        "salt and pepper to taste" → (None, None, "salt and pepper to taste")
    """
    line = line.strip()
    if not line:
        return None, None, ''

    # Try to extract a leading quantity
    quantity = None
    rest = line

    # Match leading number (with optional fraction)
    m = re.match(r'^(\d+\s*[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]|\d+\s+\d+/\d+|\d+/\d+|\d+\.?\d*)\s*(.*)', line)
    if m:
        quantity = parse_fraction(m.group(1))
        rest = m.group(2)
    else:
        # Check for leading unicode fraction alone
        for frac_char, frac_val in FRACTIONS.items():
            if line.startswith(frac_char):
                quantity = frac_val
                rest = line[len(frac_char):].strip()
                break

    # Try to match a unit
    unit = None
    rest_lower = rest.lower()
    for u in UNITS:
        # Match unit followed by space or end of string
        if rest_lower.startswith(u) and (len(rest) == len(u) or rest[len(u)] in ' \t.,'):
            unit = u
            rest = rest[len(u):].strip().lstrip('.,').strip()
            break

    # Strip leading "of " from name (e.g., "2 cups of flour")
    if rest.lower().startswith('of '):
        rest = rest[3:]

    name = rest.strip()

    return quantity, unit, name


def guess_category(ingredient_name):
    """Guess the grocery category for an ingredient name."""
    name_lower = ingredient_name.lower().strip()
    # Try exact match first
    if name_lower in CATEGORY_LOOKUP:
        return CATEGORY_LOOKUP[name_lower]
    # Try substring match
    for key, cat in CATEGORY_LOOKUP.items():
        if key in name_lower or name_lower in key:
            return cat
    return 'other'


def aggregate_grocery_list(items):
    """Aggregate ingredient rows into a grocery list grouped by category.

    items: list of dicts with keys: name, quantity, unit, grocery_category, servings_ratio
    Returns: dict of category → list of {name, quantity, unit}
    """
    # Group by (normalized name, unit)
    combined = defaultdict(lambda: {'quantity': 0, 'unit': None, 'category': 'other'})

    for item in items:
        name = item['name'].lower().strip()
        unit = (item.get('unit') or '').lower().strip()
        key = (name, unit)

        qty = item.get('quantity') or 0
        ratio = item.get('servings_ratio', 1)
        combined[key]['quantity'] += qty * ratio
        combined[key]['unit'] = item.get('unit')
        combined[key]['category'] = item.get('grocery_category') or guess_category(name)

    # Group by category
    grouped = defaultdict(list)
    for (name, _unit), info in sorted(combined.items()):
        entry = {
            'name': name.title(),
            'quantity': round(info['quantity'], 2) if info['quantity'] else None,
            'unit': info['unit'],
        }
        grouped[info['category']].append(entry)

    # Sort categories in preferred order
    category_order = ['produce', 'meat', 'seafood', 'dairy', 'bakery', 'pantry', 'beverages', 'other']
    result = {}
    for cat in category_order:
        if cat in grouped:
            result[cat] = grouped[cat]
    for cat in sorted(grouped.keys()):
        if cat not in result:
            result[cat] = grouped[cat]

    return result


def search_by_ingredients(db, ingredient_names):
    """Search recipes by available ingredients, ranked by match percentage.

    Returns list of dicts: {recipe, matched, missing, match_pct}
    """
    if not ingredient_names:
        return []

    # Normalize search terms
    search_terms = [name.lower().strip() for name in ingredient_names if name.strip()]

    # Get all recipes with their ingredients
    recipes = db.execute(
        'SELECT r.id, r.title, r.description, r.servings FROM recipe r ORDER BY r.title'
    ).fetchall()

    results = []
    for recipe in recipes:
        ingredients = db.execute(
            'SELECT name FROM ingredient WHERE recipe_id = ?', (recipe['id'],)
        ).fetchall()

        ingredient_names_list = [row['name'].lower() for row in ingredients]

        matched = []
        for term in search_terms:
            for ing_name in ingredient_names_list:
                if term in ing_name or ing_name in term:
                    matched.append(ing_name.title())
                    break

        if not matched:
            continue

        missing = [name.title() for name in ingredient_names_list if name.title() not in matched]
        total = len(ingredient_names_list) if ingredient_names_list else 1
        match_pct = len(matched) / total * 100

        results.append({
            'recipe': recipe,
            'matched': matched,
            'missing': missing,
            'match_pct': round(match_pct),
        })

    results.sort(key=lambda x: x['match_pct'], reverse=True)
    return results
