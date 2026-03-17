"""Seed the database with sample recipes when it is empty."""

import json
import os
import shutil

SEED_DIR = os.path.join(os.path.dirname(__file__), 'seed', 'photos')
PHOTO_DIR = os.path.join(os.path.dirname(__file__), 'static', 'photos')

RECIPES = [
    {
        'title': 'Toffee Bites',
        'description': 'Homemade chewy caramel toffee bites — inspired by the classic Fantale. Wrap in baking paper for gifting.',
        'prep_time': 15,
        'cook_time': 7,
        'servings': 24,
        'source': 'https://www.taste.com.au/recipes/homemade-fantales-recipe/141brctt',
        'steps': json.dumps([
            "Place condensed milk, brown sugar, caster sugar, butter and glucose syrup in a saucepan over medium-high heat.",
            "Bring to the boil, stirring constantly.",
            "Reduce heat to medium and cook at a strong boil, stirring constantly for 5-7 minutes or until the mixture is a deep caramel and pulls away from the side of the saucepan.",
            "Pour into a container lined with baking paper. Sprinkle top with rock salt. Leave overnight in the fridge to set.",
            "Cut into small cubes and wrap each one in baking paper twisted into a lolly shape.",
            "Keep in the fridge.",
        ]),
        'ingredients': [
            (1.0, 'can', '(395g) sweetened condensed milk', 'dairy'),
            (0.5, 'cup', 'brown sugar, firmly packed', 'pantry'),
            (0.5, 'cup', 'caster sugar', 'pantry'),
            (125.0, 'g', 'salted butter', 'dairy'),
            (0.25, 'cup', 'glucose syrup', 'other'),
        ],
        'tags': ['dessert', 'sweets', 'gifts'],
        'photo': 'c74d01fffaf3408f8f7c71949de2006a.jpg',
    },
    {
        'title': 'Sourdough Bread',
        'description': 'Takes 24 hours from starter prep to baked bread. Prepare starter in the morning, make dough at night, bake bread the following morning.',
        'prep_time': 180,
        'cook_time': 55,
        'servings': 1,
        'source': '',
        'steps': json.dumps([
            "Prepare starter (morning): Mix 50g starter and 50g water together, then add 50g flour. Mark level on jar with a pen. Sit on bench all day (8-12 hours). Starter is ready when it has more than doubled in size.",
            "Put excess starter back in original starter jar and mix well. Store in fridge.",
            "Make dough (evening): Mix 120g starter and 240g cool water, then add 360g flour. Lightly mix until starter is incorporated.",
            "Once a dough, add 8g salt on top and rest for 30 mins.",
            "Stretch and fold, wait 30 minutes. There will be 4 stretch and folds across a 2 hour period.",
            "Stretch and fold, wait 30 mins.",
            "Stretch and fold, wait 30 mins.",
            "Final stretch and fold.",
            "Shape the dough on the counter (no flour or water on counter), using bare hands to give dough tension. Shape using hands at 45 degree angle \u2014 push across and down multiple times until dough skin is not sticky. Store in a container in the fridge overnight.",
            "Coil fold dough (next morning). Take out dough from fridge. Use a little bit of flour on surface of dough and counter. Flip upside down so top is face down on counter. Fold dough like swaddling a baby. Tuck all edges in tightly. Then roll whole dough tightly like a cinnamon scroll. Pinch edges so it holds shape. Then put in banneton basket, cover and rest on counter for 1 hour or in fridge for at least 2 hours.",
            "Flour banneton basket generously.",
            "Preheat oven to 230 degrees with dutch oven inside.",
            "Flip dough out of banneton basket and onto baking paper. Score with a blade by making 1 deep (1cm) cut on the side of the bread.",
            "Put bread in dutch oven and cover with lid for 30 minutes.",
            "After 30 minutes, take lid off dutch oven and bake for another 25 minutes.",
            "Take bread out of oven and let cool on counter for at least 45 minutes. If you do not wait for it to cool down, the dough will be gummy inside.",
        ]),
        'ingredients': [
            (50.0, 'g', 'starter', 'other'),
            (50.0, 'g', 'water (starter prep)', 'other'),
            (50.0, 'g', 'flour (starter prep)', 'pantry'),
            (120.0, 'g', 'prepared starter', 'other'),
            (240.0, 'g', 'cool water', 'other'),
            (360.0, 'g', 'flour', 'pantry'),
            (8.0, 'g', 'salt', 'pantry'),
        ],
        'tags': ['baking', 'bread', 'sourdough'],
        'photo': '22db3d42a66b41889d7856316ddedd2f.jpeg',
    },
    {
        'title': 'Creamy Tuscan Chicken Soup',
        'description': 'Creamy broth, juicy chicken, pasta, spinach, and sun dried tomato. One-pot dish.',
        'prep_time': 15,
        'cook_time': 20,
        'servings': 5,
        'source': 'https://www.recipetineats.com/creamy-tuscan-chicken-soup/',
        'steps': json.dumps([
            "Season chicken with salt and pepper. Sear both sides in melted butter (3 min + 2 min); set aside.",
            "Saute garlic, onion, and celery on medium-low heat until softened (~3 minutes).",
            "Add wine, simmer until reduced by half.",
            "Add stock, water, salt, and pepper; bring to boil and add pasta.",
            "Chop chicken into pieces and add mid-cooking.",
            "Once pasta is done, reduce heat and stir in parmesan, cornstarch mixture, cream, and spinach.",
            "Serve topped with sun-dried tomato strips.",
        ]),
        'ingredients': [
            (None, None, '500g chicken thighs', None),
            (None, None, '1/2 tsp salt', None),
            (None, None, '1/2 tsp pepper', None),
            (None, None, '30g unsalted butter', None),
            (None, None, '1 onion, finely chopped', None),
            (None, None, '2 garlic cloves, minced', None),
            (None, None, '2 celery stems, sliced', None),
            (None, None, '1/2 cup dry white wine', None),
            (None, None, '4 cups chicken stock', None),
            (None, None, '3 cups water', None),
            (None, None, '1 tsp salt', None),
            (None, None, '1/2 tsp pepper', None),
            (None, None, '250g small pasta shells', None),
            (None, None, '1 cup grated parmesan', None),
            (None, None, '1 cup heavy cream', None),
            (None, None, '2 cups baby spinach, chopped', None),
            (None, None, '1/2 cup sun-dried tomato strips', None),
            (None, None, '2 tsp cornstarch mixed with 2 tsp water', None),
        ],
        'tags': ['italian', 'chicken', 'soup'],
        'photo': '947e4f6093e544d0b1cfc32cc387cfd5.jpg',
    },
    {
        'title': 'Plain Scones',
        'description': '3 ingredients, in the oven under 10 minutes! Soft and fluffy, serve with jam and cream.',
        'prep_time': 10,
        'cook_time': 12,
        'servings': 10,
        'source': 'https://www.recipetineats.com/plain-scones/',
        'steps': json.dumps([
            "Preheat oven to 200\u00b0C/390\u00b0F.",
            "Place flour in food processor, add cold butter cubes, blitz 8 seconds until resembling breadcrumbs.",
            "Pour cold milk over flour, blitz 6-8 seconds until mixture forms a ball.",
            "Transfer dough to work surface, knead lightly (max 10 times), pat into 2cm thick disc.",
            "Dip 5cm round cutter in flour, plunge straight down (do not twist). Repeat across disc.",
            "Transfer scones to baking tray. Gather scraps, repeat cutting (yields 10 total).",
            "Brush tops lightly with milk.",
            "Bake 10-12 minutes until golden and hollow when tapped.",
            "Wrap loosely in dish towel. Cool 10-15 minutes, serve warm.",
            "Split by hand, add jam and whipped cream.",
        ]),
        'ingredients': [
            (None, None, '3 cups self-raising flour', None),
            (None, None, '80g cold salted butter, cubed', None),
            (None, None, '1 cup cold milk', None),
            (None, None, 'Extra flour for dusting', None),
            (None, None, 'Extra milk for brushing', None),
        ],
        'tags': ['baking', 'scones', 'afternoon tea'],
        'photo': '2c757c0be7d64f28b8a0a53534f44078.jpg',
    },
    {
        'title': 'Bolognese Sauce',
        'description': 'A thick, rich Bolognese with great depth of flavour. Sauce only \u2014 serve with your choice of pasta.',
        'prep_time': 10,
        'cook_time': 30,
        'servings': 5,
        'source': 'https://www.recipetineats.com/spaghetti-bolognese/',
        'steps': json.dumps([
            "Heat oil in large pot over medium-high heat. Add onion and garlic; cook 3 minutes until softened.",
            "Increase heat to high, add beef, breaking it apart until browned.",
            "Add red wine, simmer 1 minute while scraping the pot bottom.",
            "Add crushed tomato, tomato paste, bouillon, Worcestershire, bay leaves, thyme, sugar, salt and pepper.",
            "Bring to simmer, reduce to medium heat. Cook 20-30 minutes uncovered, stirring occasionally.",
            "Taste and adjust salt as needed.",
        ]),
        'ingredients': [
            (None, None, '1 1/2 tbsp olive oil', None),
            (None, None, '2 garlic cloves, minced', None),
            (None, None, '1 onion, finely chopped', None),
            (None, None, '500g beef mince', None),
            (None, None, '1/2 cup dry red wine', None),
            (None, None, '2 beef bouillon cubes', None),
            (None, None, '800g canned crushed tomato', None),
            (None, None, '2 tbsp tomato paste', None),
            (None, None, '2 tsp white sugar', None),
            (None, None, '2 tsp Worcestershire sauce', None),
            (None, None, '2 bay leaves', None),
            (None, None, '2 sprigs fresh thyme', None),
            (None, None, '3/4 tsp salt', None),
            (None, None, '1/2 tsp black pepper', None),
        ],
        'tags': ['italian', 'dinner', 'sauce'],
        'photo': '4bb4346ba45c47a89384bcee33aa2ebb.jpg',
    },
]


def seed_db(db):
    """Insert sample recipes if the database is empty."""
    count = db.execute('SELECT COUNT(*) FROM recipe').fetchone()[0]
    if count > 0:
        return

    for recipe in RECIPES:
        cur = db.execute(
            'INSERT INTO recipe (title, description, prep_time, cook_time, servings, source, steps) '
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
            (recipe['title'], recipe['description'], recipe['prep_time'],
             recipe['cook_time'], recipe['servings'], recipe['source'], recipe['steps']),
        )
        recipe_id = cur.lastrowid

        for i, (qty, unit, name, category) in enumerate(recipe['ingredients']):
            db.execute(
                'INSERT INTO ingredient (recipe_id, quantity, unit, name, grocery_category, sort_order) '
                'VALUES (?, ?, ?, ?, ?, ?)',
                (recipe_id, qty, unit, name, category, i),
            )

        for tag_name in recipe['tags']:
            tag = db.execute('SELECT id FROM tag WHERE name = ?', (tag_name,)).fetchone()
            if tag is None:
                tag_id = db.execute('INSERT INTO tag (name) VALUES (?)', (tag_name,)).lastrowid
            else:
                tag_id = tag[0]
            db.execute('INSERT INTO recipe_tag (recipe_id, tag_id) VALUES (?, ?)', (recipe_id, tag_id))

        # Copy photo files from seed directory to photos directory
        filename = recipe['photo']
        thumb_filename = 'thumb_' + filename
        src = os.path.join(SEED_DIR, filename)
        thumb_src = os.path.join(SEED_DIR, thumb_filename)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(PHOTO_DIR, filename))
        if os.path.exists(thumb_src):
            shutil.copy2(thumb_src, os.path.join(PHOTO_DIR, thumb_filename))

        db.execute(
            'INSERT INTO photo (recipe_id, filename, is_primary) VALUES (?, ?, 1)',
            (recipe_id, filename),
        )

    db.commit()
