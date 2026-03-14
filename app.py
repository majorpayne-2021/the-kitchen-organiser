"""Recipe Manager — a local web app for storing and querying recipes."""

import json
import os
import sqlite3
import uuid

from flask import (
    Flask, render_template, request, redirect, url_for, g, flash, jsonify,
    send_from_directory,
)
from PIL import Image

from helpers import parse_ingredient, guess_category, aggregate_grocery_list, search_by_ingredients

app = Flask(__name__)
app.secret_key = os.urandom(24)

DATABASE = os.path.join(app.root_path, 'recipes.db')
PHOTO_DIR = os.path.join(app.static_folder, 'photos')
THUMB_SIZE = (400, 400)

os.makedirs(PHOTO_DIR, exist_ok=True)


# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    with app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf-8'))
    db.commit()


@app.cli.command('init-db')
def init_db_command():
    init_db()
    print('Database initialized.')


# Auto-create tables on first request
@app.before_request
def ensure_db():
    db = get_db()
    # Check if recipe table exists
    table = db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='recipe'"
    ).fetchone()
    if table is None:
        init_db()


# ── Template Helpers ──────────────────────────────────────────────────────────

@app.template_filter('fromjson')
def fromjson_filter(s):
    if not s:
        return []
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return []


# ── Recipe Routes ─────────────────────────────────────────────────────────────

@app.route('/')
def index():
    db = get_db()
    tag_filter = request.args.get('tag', '')
    search_query = request.args.get('q', '')

    query = '''
        SELECT r.*, p.filename AS photo
        FROM recipe r
        LEFT JOIN photo p ON p.recipe_id = r.id AND p.is_primary = 1
    '''
    params = []

    if tag_filter:
        query += '''
            JOIN recipe_tag rt ON rt.recipe_id = r.id
            JOIN tag t ON t.id = rt.tag_id AND t.name = ?
        '''
        params.append(tag_filter)

    if search_query:
        query += ' WHERE r.title LIKE ?' if 'WHERE' not in query else ' AND r.title LIKE ?'
        params.append(f'%{search_query}%')

    query += ' ORDER BY r.updated_at DESC'
    recipes = db.execute(query, params).fetchall()

    tags = db.execute('SELECT DISTINCT name FROM tag ORDER BY name').fetchall()
    return render_template('index.html', recipes=recipes, tags=tags,
                           current_tag=tag_filter, search_query=search_query)


@app.route('/recipe/new', methods=['GET', 'POST'])
def recipe_new():
    if request.method == 'POST':
        return save_recipe(None)
    return render_template('recipe_form.html', recipe=None, ingredients_text='',
                           steps_text='', tags_text='')


@app.route('/recipe/<int:recipe_id>')
def recipe_detail(recipe_id):
    db = get_db()
    recipe = db.execute('SELECT * FROM recipe WHERE id = ?', (recipe_id,)).fetchone()
    if recipe is None:
        flash('Recipe not found.')
        return redirect(url_for('index'))

    ingredients = db.execute(
        'SELECT * FROM ingredient WHERE recipe_id = ? ORDER BY sort_order', (recipe_id,)
    ).fetchall()
    photos = db.execute(
        'SELECT * FROM photo WHERE recipe_id = ? ORDER BY is_primary DESC, created_at', (recipe_id,)
    ).fetchall()
    notes = db.execute(
        'SELECT * FROM note WHERE recipe_id = ? ORDER BY created_at DESC', (recipe_id,)
    ).fetchall()
    tags = db.execute(
        'SELECT t.name FROM tag t JOIN recipe_tag rt ON rt.tag_id = t.id WHERE rt.recipe_id = ?',
        (recipe_id,)
    ).fetchall()

    return render_template('recipe_detail.html', recipe=recipe, ingredients=ingredients,
                           photos=photos, notes=notes, tags=tags)


@app.route('/recipe/<int:recipe_id>/edit', methods=['GET', 'POST'])
def recipe_edit(recipe_id):
    db = get_db()
    if request.method == 'POST':
        return save_recipe(recipe_id)

    recipe = db.execute('SELECT * FROM recipe WHERE id = ?', (recipe_id,)).fetchone()
    if recipe is None:
        flash('Recipe not found.')
        return redirect(url_for('index'))

    ingredients = db.execute(
        'SELECT * FROM ingredient WHERE recipe_id = ? ORDER BY sort_order', (recipe_id,)
    ).fetchall()
    tags = db.execute(
        'SELECT t.name FROM tag t JOIN recipe_tag rt ON rt.tag_id = t.id WHERE rt.recipe_id = ?',
        (recipe_id,)
    ).fetchall()

    # Reconstruct text for form fields
    ing_lines = []
    for ing in ingredients:
        parts = []
        if ing['quantity']:
            q = ing['quantity']
            parts.append(str(int(q)) if q == int(q) else str(q))
        if ing['unit']:
            parts.append(ing['unit'])
        parts.append(ing['name'])
        ing_lines.append(' '.join(parts))

    steps = json.loads(recipe['steps']) if recipe['steps'] else []
    tags_text = ', '.join(t['name'] for t in tags)

    return render_template('recipe_form.html', recipe=recipe,
                           ingredients_text='\n'.join(ing_lines),
                           steps_text='\n'.join(steps),
                           tags_text=tags_text)


@app.route('/recipe/<int:recipe_id>/delete', methods=['POST'])
def recipe_delete(recipe_id):
    db = get_db()
    # Delete associated photos from disk
    photos = db.execute('SELECT filename FROM photo WHERE recipe_id = ?', (recipe_id,)).fetchall()
    for photo in photos:
        path = os.path.join(PHOTO_DIR, photo['filename'])
        if os.path.exists(path):
            os.remove(path)
        thumb = os.path.join(PHOTO_DIR, 'thumb_' + photo['filename'])
        if os.path.exists(thumb):
            os.remove(thumb)

    db.execute('DELETE FROM recipe WHERE id = ?', (recipe_id,))
    db.commit()
    flash('Recipe deleted.')
    return redirect(url_for('index'))


def save_recipe(recipe_id):
    """Create or update a recipe from form data."""
    db = get_db()

    title = request.form.get('title', '').strip()
    if not title:
        flash('Title is required.')
        return redirect(request.url)

    description = request.form.get('description', '').strip()
    prep_time = request.form.get('prep_time', type=int)
    cook_time = request.form.get('cook_time', type=int)
    servings = request.form.get('servings', type=int)
    source = request.form.get('source', '').strip()

    # Parse steps from textarea (one step per line)
    steps_text = request.form.get('steps', '')
    steps = [s.strip() for s in steps_text.strip().split('\n') if s.strip()]
    steps_json = json.dumps(steps)

    if recipe_id is None:
        cur = db.execute(
            '''INSERT INTO recipe (title, description, prep_time, cook_time, servings, source, steps)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (title, description, prep_time, cook_time, servings, source, steps_json)
        )
        recipe_id = cur.lastrowid
    else:
        db.execute(
            '''UPDATE recipe SET title=?, description=?, prep_time=?, cook_time=?,
               servings=?, source=?, steps=?, updated_at=CURRENT_TIMESTAMP
               WHERE id=?''',
            (title, description, prep_time, cook_time, servings, source, steps_json, recipe_id)
        )

    # Parse and save ingredients
    db.execute('DELETE FROM ingredient WHERE recipe_id = ?', (recipe_id,))
    ingredients_text = request.form.get('ingredients', '')
    for i, line in enumerate(ingredients_text.strip().split('\n')):
        line = line.strip()
        if not line:
            continue
        qty, unit, name = parse_ingredient(line)
        if not name:
            continue
        category = guess_category(name)
        db.execute(
            '''INSERT INTO ingredient (recipe_id, name, quantity, unit, grocery_category, sort_order)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (recipe_id, name, qty, unit, category, i)
        )

    # Handle tags
    db.execute('DELETE FROM recipe_tag WHERE recipe_id = ?', (recipe_id,))
    tags_text = request.form.get('tags', '')
    for tag_name in tags_text.split(','):
        tag_name = tag_name.strip().lower()
        if not tag_name:
            continue
        existing = db.execute('SELECT id FROM tag WHERE name = ?', (tag_name,)).fetchone()
        if existing:
            tag_id = existing['id']
        else:
            tag_id = db.execute('INSERT INTO tag (name) VALUES (?)', (tag_name,)).lastrowid
        db.execute(
            'INSERT OR IGNORE INTO recipe_tag (recipe_id, tag_id) VALUES (?, ?)',
            (recipe_id, tag_id)
        )

    db.commit()
    flash('Recipe saved!')
    return redirect(url_for('recipe_detail', recipe_id=recipe_id))


# ── Photo Routes ──────────────────────────────────────────────────────────────

@app.route('/recipe/<int:recipe_id>/photo', methods=['POST'])
def photo_upload(recipe_id):
    db = get_db()
    file = request.files.get('photo')
    if not file or not file.filename:
        flash('No photo selected.')
        return redirect(url_for('recipe_detail', recipe_id=recipe_id))

    # Generate a unique filename
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
        flash('Unsupported image format.')
        return redirect(url_for('recipe_detail', recipe_id=recipe_id))

    filename = f'{uuid.uuid4().hex}{ext}'
    filepath = os.path.join(PHOTO_DIR, filename)
    file.save(filepath)

    # Generate thumbnail
    try:
        img = Image.open(filepath)
        img.thumbnail(THUMB_SIZE)
        thumb_path = os.path.join(PHOTO_DIR, f'thumb_{filename}')
        img.save(thumb_path)
    except Exception:
        pass  # Still save photo even if thumbnail fails

    # Check if this is the first photo (make it primary)
    existing = db.execute('SELECT COUNT(*) as cnt FROM photo WHERE recipe_id = ?', (recipe_id,)).fetchone()
    is_primary = 1 if existing['cnt'] == 0 else 0

    caption = request.form.get('caption', '').strip()
    db.execute(
        'INSERT INTO photo (recipe_id, filename, caption, is_primary) VALUES (?, ?, ?, ?)',
        (recipe_id, filename, caption, is_primary)
    )
    db.commit()
    flash('Photo uploaded!')
    return redirect(url_for('recipe_detail', recipe_id=recipe_id))


@app.route('/photo/<int:photo_id>/primary', methods=['POST'])
def photo_set_primary(photo_id):
    db = get_db()
    photo = db.execute('SELECT * FROM photo WHERE id = ?', (photo_id,)).fetchone()
    if photo is None:
        flash('Photo not found.')
        return redirect(url_for('index'))

    db.execute('UPDATE photo SET is_primary = 0 WHERE recipe_id = ?', (photo['recipe_id'],))
    db.execute('UPDATE photo SET is_primary = 1 WHERE id = ?', (photo_id,))
    db.commit()
    return redirect(url_for('recipe_detail', recipe_id=photo['recipe_id']))


@app.route('/photo/<int:photo_id>/delete', methods=['POST'])
def photo_delete(photo_id):
    db = get_db()
    photo = db.execute('SELECT * FROM photo WHERE id = ?', (photo_id,)).fetchone()
    if photo is None:
        flash('Photo not found.')
        return redirect(url_for('index'))

    # Remove files
    for prefix in ('', 'thumb_'):
        path = os.path.join(PHOTO_DIR, prefix + photo['filename'])
        if os.path.exists(path):
            os.remove(path)

    db.execute('DELETE FROM photo WHERE id = ?', (photo_id,))
    db.commit()
    flash('Photo deleted.')
    return redirect(url_for('recipe_detail', recipe_id=photo['recipe_id']))


# ── Note Routes ───────────────────────────────────────────────────────────────

@app.route('/recipe/<int:recipe_id>/note', methods=['POST'])
def note_add(recipe_id):
    content = request.form.get('content', '').strip()
    if not content:
        flash('Note cannot be empty.')
        return redirect(url_for('recipe_detail', recipe_id=recipe_id))

    db = get_db()
    db.execute('INSERT INTO note (recipe_id, content) VALUES (?, ?)', (recipe_id, content))
    db.commit()
    flash('Note added!')
    return redirect(url_for('recipe_detail', recipe_id=recipe_id))


@app.route('/note/<int:note_id>/delete', methods=['POST'])
def note_delete(note_id):
    db = get_db()
    note = db.execute('SELECT * FROM note WHERE id = ?', (note_id,)).fetchone()
    if note is None:
        flash('Note not found.')
        return redirect(url_for('index'))

    db.execute('DELETE FROM note WHERE id = ?', (note_id,))
    db.commit()
    flash('Note deleted.')
    return redirect(url_for('recipe_detail', recipe_id=note['recipe_id']))


# ── Ingredient Search ─────────────────────────────────────────────────────────

@app.route('/search', methods=['GET', 'POST'])
def ingredient_search():
    results = []
    search_text = ''
    if request.method == 'POST':
        search_text = request.form.get('ingredients', '')
        ingredient_names = [s.strip() for s in search_text.split(',') if s.strip()]
        results = search_by_ingredients(get_db(), ingredient_names)

    return render_template('search.html', results=results, search_text=search_text)


# ── Meal Plan Routes ──────────────────────────────────────────────────────────

WEEKLY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
WEEKLY_MEALS = ['Breakfast', 'Lunch', 'Dinner']
EVENT_COURSES = ['Appetizer', 'Main', 'Side', 'Dessert', 'Drinks']


@app.route('/plans')
def plan_list():
    db = get_db()
    plans = db.execute('SELECT * FROM meal_plan ORDER BY created_at DESC').fetchall()
    return render_template('plan_list.html', plans=plans)


@app.route('/plan/new', methods=['GET', 'POST'])
def plan_new():
    if request.method == 'POST':
        return save_plan(None)
    recipes = get_db().execute('SELECT id, title FROM recipe ORDER BY title').fetchall()
    return render_template('meal_plan_form.html', plan=None, items=[], recipes=recipes,
                           days=WEEKLY_DAYS, meals=WEEKLY_MEALS, courses=EVENT_COURSES)


@app.route('/plan/<int:plan_id>')
def plan_detail(plan_id):
    db = get_db()
    plan = db.execute('SELECT * FROM meal_plan WHERE id = ?', (plan_id,)).fetchone()
    if plan is None:
        flash('Plan not found.')
        return redirect(url_for('plan_list'))

    items = db.execute('''
        SELECT mpi.*, r.title AS recipe_title
        FROM meal_plan_item mpi
        JOIN recipe r ON r.id = mpi.recipe_id
        WHERE mpi.meal_plan_id = ?
        ORDER BY mpi.sort_order
    ''', (plan_id,)).fetchall()

    if plan['plan_type'] == 'weekly':
        # Organize into grid: {day: {meal: [items]}}
        grid = {day: {meal: [] for meal in WEEKLY_MEALS} for day in WEEKLY_DAYS}
        for item in items:
            parts = item['slot_label'].split(' — ')
            if len(parts) == 2:
                day, meal = parts
                if day in grid and meal in grid[day]:
                    grid[day][meal].append(item)
        return render_template('meal_plan.html', plan=plan, grid=grid,
                               days=WEEKLY_DAYS, meals=WEEKLY_MEALS, items=items)
    else:
        # Group by course label
        courses = {}
        for item in items:
            label = item['slot_label']
            courses.setdefault(label, []).append(item)
        return render_template('meal_plan.html', plan=plan, courses=courses, items=items)


@app.route('/plan/<int:plan_id>/edit', methods=['GET', 'POST'])
def plan_edit(plan_id):
    db = get_db()
    if request.method == 'POST':
        return save_plan(plan_id)

    plan = db.execute('SELECT * FROM meal_plan WHERE id = ?', (plan_id,)).fetchone()
    if plan is None:
        flash('Plan not found.')
        return redirect(url_for('plan_list'))

    items = db.execute('''
        SELECT mpi.* FROM meal_plan_item mpi WHERE mpi.meal_plan_id = ?
        ORDER BY mpi.sort_order
    ''', (plan_id,)).fetchall()
    recipes = db.execute('SELECT id, title FROM recipe ORDER BY title').fetchall()

    return render_template('meal_plan_form.html', plan=plan, items=items, recipes=recipes,
                           days=WEEKLY_DAYS, meals=WEEKLY_MEALS, courses=EVENT_COURSES)


@app.route('/plan/<int:plan_id>/delete', methods=['POST'])
def plan_delete(plan_id):
    db = get_db()
    db.execute('DELETE FROM meal_plan WHERE id = ?', (plan_id,))
    db.commit()
    flash('Plan deleted.')
    return redirect(url_for('plan_list'))


def save_plan(plan_id):
    db = get_db()
    name = request.form.get('name', '').strip()
    plan_type = request.form.get('plan_type', 'weekly')

    if not name:
        flash('Plan name is required.')
        return redirect(request.url)

    if plan_id is None:
        cur = db.execute(
            'INSERT INTO meal_plan (name, plan_type) VALUES (?, ?)', (name, plan_type)
        )
        plan_id = cur.lastrowid
    else:
        db.execute('UPDATE meal_plan SET name = ?, plan_type = ? WHERE id = ?',
                   (name, plan_type, plan_id))

    # Clear existing items and re-add
    db.execute('DELETE FROM meal_plan_item WHERE meal_plan_id = ?', (plan_id,))

    # Items come as parallel arrays
    slot_labels = request.form.getlist('slot_label')
    recipe_ids = request.form.getlist('recipe_id')
    servings_list = request.form.getlist('servings_override')

    for i, (slot, rid) in enumerate(zip(slot_labels, recipe_ids)):
        rid = rid.strip()
        if not rid:
            continue
        try:
            rid = int(rid)
        except ValueError:
            continue
        servings = None
        if i < len(servings_list) and servings_list[i].strip():
            try:
                servings = int(servings_list[i])
            except ValueError:
                pass
        db.execute(
            '''INSERT INTO meal_plan_item (meal_plan_id, recipe_id, slot_label, servings_override, sort_order)
               VALUES (?, ?, ?, ?, ?)''',
            (plan_id, rid, slot, servings, i)
        )

    db.commit()
    flash('Plan saved!')
    return redirect(url_for('plan_detail', plan_id=plan_id))


# ── Grocery List ──────────────────────────────────────────────────────────────

@app.route('/plan/<int:plan_id>/grocery')
def grocery_list(plan_id):
    db = get_db()
    plan = db.execute('SELECT * FROM meal_plan WHERE id = ?', (plan_id,)).fetchone()
    if plan is None:
        flash('Plan not found.')
        return redirect(url_for('plan_list'))

    items = db.execute('''
        SELECT mpi.servings_override, r.servings AS recipe_servings,
               i.name, i.quantity, i.unit, i.grocery_category
        FROM meal_plan_item mpi
        JOIN recipe r ON r.id = mpi.recipe_id
        JOIN ingredient i ON i.recipe_id = r.id
        WHERE mpi.meal_plan_id = ?
    ''', (plan_id,)).fetchall()

    grocery_items = []
    for item in items:
        ratio = 1
        if item['servings_override'] and item['recipe_servings']:
            ratio = item['servings_override'] / item['recipe_servings']
        grocery_items.append({
            'name': item['name'],
            'quantity': item['quantity'],
            'unit': item['unit'],
            'grocery_category': item['grocery_category'],
            'servings_ratio': ratio,
        })

    grouped = aggregate_grocery_list(grocery_items)
    return render_template('grocery_list.html', plan=plan, grouped=grouped)


# ── API for recipe search (used by meal plan form) ───────────────────────────

@app.route('/api/recipes')
def api_recipes():
    q = request.args.get('q', '')
    db = get_db()
    if q:
        recipes = db.execute(
            'SELECT id, title FROM recipe WHERE title LIKE ? ORDER BY title LIMIT 20',
            (f'%{q}%',)
        ).fetchall()
    else:
        recipes = db.execute('SELECT id, title FROM recipe ORDER BY title LIMIT 50').fetchall()
    return jsonify([{'id': r['id'], 'title': r['title']} for r in recipes])


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)
