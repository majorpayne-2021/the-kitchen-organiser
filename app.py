"""Recipe Manager — a local web app for storing and querying recipes."""

import json
import os
import sqlite3
import uuid

from flask import (
    Flask, render_template, request, redirect, url_for, g, flash, jsonify,
    send_from_directory,
)
from PIL import Image, ImageOps

from helpers import parse_ingredient, guess_category, aggregate_grocery_list, search_by_ingredients
from scraper import scrape_url
from seed import seed_db

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.jinja_env.auto_reload = False
app.config['TEMPLATES_AUTO_RELOAD'] = False

DATABASE = os.path.join(app.root_path, 'recipes.db')
PHOTO_DIR = os.path.join(app.static_folder, 'photos')
THUMB_SIZE = (400, 400)

os.makedirs(PHOTO_DIR, exist_ok=True)

# Pre-load all templates at startup and pin them in Jinja's cache so that
# the loader never re-reads from disk.  This prevents the macOS
# "OSError: [Errno 11] Resource deadlock avoided" that occurs when
# sleep/wake cycles leave the kernel file-lock table in a bad state.
import time as _time
from jinja2 import BaseLoader, TemplateNotFound

class _PinnedLoader(BaseLoader):
    """Wraps the default Flask loader but pins every template after first load.

    Once a template has been successfully read from disk its source is kept
    in memory.  Subsequent calls return the cached source with an *uptodate*
    callback that always returns ``True``, so Jinja never touches the
    filesystem again for that template.
    """

    def __init__(self, original_loader):
        self._inner = original_loader
        self._cache = {}            # template name -> (source, filename)

    def get_source(self, environment, template):
        if template in self._cache:
            source, filename = self._cache[template]
            return source, filename, lambda: True   # always up-to-date

        source, filename, _ = self._inner.get_source(environment, template)
        self._cache[template] = (source, filename)
        return source, filename, lambda: True

app.jinja_loader = _PinnedLoader(app.jinja_loader)

with app.app_context():
    templates_dir = os.path.join(app.root_path, 'templates')
    for template_name in sorted(os.listdir(templates_dir)):
        if template_name.endswith('.html'):
            for attempt in range(5):
                try:
                    app.jinja_env.get_template(template_name)
                    break
                except OSError:
                    _time.sleep(1)
                except Exception:
                    break


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
        seed_db(get_db())


# ── Template Helpers ──────────────────────────────────────────────────────────

@app.template_filter('fromjson')
def fromjson_filter(s):
    if not s:
        return []
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return []


@app.template_filter('event_datetime')
def event_datetime_filter(plan):
    """Format event date and time nicely, e.g. 'Monday, 16th March 2026 at 3pm'."""
    from datetime import datetime
    if not plan['event_date']:
        return ''
    try:
        dt = datetime.strptime(plan['event_date'], '%Y-%m-%d')
    except (ValueError, TypeError):
        return plan['event_date']

    day = dt.day
    if 11 <= day <= 13:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')

    date_str = dt.strftime(f'%A, {day}{suffix} %B %Y')

    if plan['event_time']:
        try:
            t = datetime.strptime(plan['event_time'], '%H:%M')
            if t.minute == 0:
                time_str = t.strftime('%I%p').lstrip('0').lower()
            else:
                time_str = t.strftime('%I:%M%p').lstrip('0').lower()
            date_str += f' at {time_str}'
        except (ValueError, TypeError):
            date_str += f' at {plan["event_time"]}'

    return date_str


@app.template_filter('format_date')
def format_date_filter(date_str):
    """Format a date string nicely, e.g. 'Monday, 16th March 2026'."""
    from datetime import datetime
    if not date_str:
        return ''
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
    except (ValueError, TypeError):
        return date_str

    day = dt.day
    if 11 <= day <= 13:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')

    return dt.strftime(f'%A, {day}{suffix} %B %Y')


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.route('/')
def dashboard():
    db = get_db()
    recipe_count = db.execute('SELECT COUNT(*) as cnt FROM recipe').fetchone()['cnt']
    meal_plan_count = db.execute("SELECT COUNT(*) as cnt FROM meal_plan WHERE plan_type = 'weekly'").fetchone()['cnt']
    event_plan_count = db.execute("SELECT COUNT(*) as cnt FROM meal_plan WHERE plan_type = 'event'").fetchone()['cnt']
    gift_count = db.execute('SELECT COUNT(*) as cnt FROM gift_hamper').fetchone()['cnt']
    recent_recipes = db.execute('''
        SELECT r.*, p.filename AS photo FROM recipe r
        LEFT JOIN photo p ON p.recipe_id = r.id AND p.is_primary = 1
        ORDER BY r.created_at DESC LIMIT 4
    ''').fetchall()
    return render_template('dashboard.html', recipe_count=recipe_count,
                           meal_plan_count=meal_plan_count, event_plan_count=event_plan_count,
                           gift_count=gift_count, recent_recipes=recent_recipes)


# ── Recipe Routes ─────────────────────────────────────────────────────────────

@app.route('/recipes')
def index():
    db = get_db()
    tag_filter = request.args.get('tag', '')
    search_query = request.args.get('q', '')

    query = '''
        SELECT DISTINCT r.*, p.filename AS photo
        FROM recipe r
        LEFT JOIN photo p ON p.recipe_id = r.id AND p.is_primary = 1
        LEFT JOIN ingredient i ON i.recipe_id = r.id
        LEFT JOIN recipe_tag rt ON rt.recipe_id = r.id
        LEFT JOIN tag t ON t.id = rt.tag_id
    '''
    params = []
    conditions = []

    if tag_filter:
        conditions.append('t.name = ?')
        params.append(tag_filter)

    if search_query:
        conditions.append(
            '(r.title LIKE ? OR r.description LIKE ? OR r.source LIKE ? OR r.steps LIKE ? OR i.name LIKE ? OR t.name LIKE ?)'
        )
        like = f'%{search_query}%'
        params.extend([like, like, like, like, like, like])

    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)

    query += ' ORDER BY r.updated_at DESC'
    recipes = db.execute(query, params).fetchall()

    tags = db.execute('''
        SELECT DISTINCT t.name FROM tag t
        JOIN recipe_tag rt ON rt.tag_id = t.id
        ORDER BY t.name
    ''').fetchall()
    return render_template('index.html', recipes=recipes, tags=tags,
                           current_tag=tag_filter, search_query=search_query)


@app.route('/recipe/import', methods=['POST'])
def recipe_import():
    """Scrape a recipe from a URL and redirect to the new recipe form pre-filled."""
    url = request.form.get('url', '').strip()
    if not url:
        flash('Please enter a URL.')
        return redirect(url_for('recipe_new'))

    try:
        data = scrape_url(url, PHOTO_DIR)
    except ValueError as e:
        flash(str(e))
        return redirect(url_for('recipe_new'))
    except Exception:
        flash('Could not fetch recipe from that URL. Please check the URL and try again.')
        return redirect(url_for('recipe_new'))

    # Store scraped data in session for the form
    from flask import session
    session['import_data'] = data
    return redirect(url_for('recipe_new', from_import='1'))


@app.route('/recipe/new', methods=['GET', 'POST'])
def recipe_new():
    if request.method == 'POST':
        return save_recipe(None)

    # Check for imported data
    from flask import session
    import_data = None
    if request.args.get('from_import'):
        import_data = session.pop('import_data', None)

    if import_data:
        return render_template('recipe_form.html', recipe=None,
                               ingredients_text='\n'.join(import_data.get('ingredients', [])),
                               steps_text='\n'.join(import_data.get('steps', [])),
                               tags_text=', '.join(import_data.get('tags', [])),
                               import_data=import_data)

    return render_template('recipe_form.html', recipe=None, ingredients_text='',
                           steps_text='', tags_text='', import_data=None)


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

    # Handle imported photo (from URL scraper)
    imported_photo = request.form.get('imported_photo', '').strip()
    if imported_photo:
        photo_path = os.path.join(PHOTO_DIR, imported_photo)
        if os.path.exists(photo_path):
            db.execute(
                'INSERT INTO photo (recipe_id, filename, caption, is_primary) VALUES (?, ?, ?, ?)',
                (recipe_id, imported_photo, '', 1)
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

    # Fix orientation from EXIF and generate thumbnail
    try:
        img = Image.open(filepath)
        img = ImageOps.exif_transpose(img)
        img.save(filepath)
        thumb = img.copy()
        thumb.thumbnail(THUMB_SIZE)
        thumb_path = os.path.join(PHOTO_DIR, f'thumb_{filename}')
        thumb.save(thumb_path)
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


@app.route('/note/<int:note_id>/edit', methods=['POST'])
def note_edit(note_id):
    db = get_db()
    note = db.execute('SELECT * FROM note WHERE id = ?', (note_id,)).fetchone()
    if note is None:
        flash('Note not found.')
        return redirect(url_for('index'))

    content = request.form.get('content', '').strip()
    if not content:
        flash('Note cannot be empty.')
        return redirect(url_for('recipe_detail', recipe_id=note['recipe_id']))

    db.execute('UPDATE note SET content = ? WHERE id = ?', (content, note_id))
    db.commit()
    return redirect(url_for('recipe_detail', recipe_id=note['recipe_id']))


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
WEEKLY_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Sides', 'Snack']
EVENT_COURSES = ['Savoury', 'Salads', 'Sides', 'Sweet', 'Drinks']


@app.route('/plans')
def plan_list():
    db = get_db()
    plans = db.execute('SELECT * FROM meal_plan ORDER BY created_at DESC').fetchall()
    return render_template('plan_list.html', plans=plans)


@app.route('/meal-plans')
def meal_plan_list():
    db = get_db()
    plans = db.execute("SELECT * FROM meal_plan WHERE plan_type = 'weekly' ORDER BY created_at DESC").fetchall()
    return render_template('plan_list.html', plans=plans, plan_type='weekly',
                           page_title='Meal Plans', page_subtitle='Weekly meal plans')


@app.route('/event-plans')
def event_plan_list():
    from datetime import date
    db = get_db()
    today = date.today().isoformat()

    upcoming = db.execute("""
        SELECT * FROM meal_plan WHERE plan_type = 'event'
        AND (event_date >= ? OR event_date IS NULL)
        ORDER BY CASE WHEN event_date IS NULL THEN 1 ELSE 0 END,
                 event_date ASC, created_at DESC
    """, (today,)).fetchall()

    past = db.execute("""
        SELECT * FROM meal_plan WHERE plan_type = 'event'
        AND event_date < ?
        ORDER BY event_date DESC
    """, (today,)).fetchall()

    # Attach invitee stats to all plans
    plan_stats = {}
    for plan in list(upcoming) + list(past):
        stats = db.execute('''
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN rsvp = 'attending' THEN 1 ELSE 0 END) as attending
            FROM event_invitee WHERE meal_plan_id = ?
        ''', (plan['id'],)).fetchone()
        plan_stats[plan['id']] = {'total': stats['total'], 'attending': stats['attending'] or 0}

    return render_template('plan_list.html', plans=upcoming, past_plans=past,
                           plan_type='event',
                           page_title='Event Plans', page_subtitle='Hosting menus and events',
                           plan_stats=plan_stats)


@app.route('/plan/new', methods=['GET', 'POST'])
def plan_new():
    if request.method == 'POST':
        return save_plan(None)
    default_type = request.args.get('type', 'weekly')
    recipes = get_db().execute('SELECT id, title FROM recipe ORDER BY title').fetchall()
    return render_template('meal_plan_form.html', plan=None, items=[], recipes=recipes,
                           days=WEEKLY_DAYS, meals=WEEKLY_MEALS, courses=EVENT_COURSES,
                           default_type=default_type)


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
        LEFT JOIN recipe r ON r.id = mpi.recipe_id
        WHERE mpi.meal_plan_id = ?
        ORDER BY mpi.sort_order
    ''', (plan_id,)).fetchall()

    if plan['plan_type'] == 'weekly':
        # Organize by day → meal → [items]
        grid = {day: {} for day in WEEKLY_DAYS}
        for item in items:
            parts = item['slot_label'].split(' — ')
            if len(parts) == 2:
                day, meal = parts
                if day in grid:
                    grid[day].setdefault(meal, []).append(item)

        # Load day notes
        day_notes = {}
        for row in db.execute(
            'SELECT * FROM meal_plan_day_note WHERE meal_plan_id = ?', (plan['id'],)
        ).fetchall():
            day_notes[row['day']] = row

        recipes = db.execute('SELECT id, title FROM recipe ORDER BY title').fetchall()
        return render_template('meal_plan.html', plan=plan, grid=grid,
                               days=WEEKLY_DAYS, meals=WEEKLY_MEALS, items=items,
                               day_notes=day_notes, recipes=recipes)
    else:
        # Group by category label
        categories = {}
        for item in items:
            label = item['slot_label']
            categories.setdefault(label, []).append(item)
        # Load event notes
        event_notes = db.execute(
            'SELECT * FROM event_note WHERE meal_plan_id = ? ORDER BY created_at DESC',
            (plan_id,)
        ).fetchall()
        event_photos = db.execute(
            'SELECT * FROM event_photo WHERE meal_plan_id = ? ORDER BY created_at',
            (plan_id,)
        ).fetchall()
        invitees = db.execute(
            'SELECT * FROM event_invitee WHERE meal_plan_id = ? ORDER BY name',
            (plan_id,)
        ).fetchall()
        invitee_stats = {
            'total': len(invitees),
            'attending': sum(1 for i in invitees if i['rsvp'] == 'attending'),
            'not_attending': sum(1 for i in invitees if i['rsvp'] == 'not attending'),
            'pending': sum(1 for i in invitees if i['rsvp'] == 'pending'),
        }
        return render_template('meal_plan.html', plan=plan, categories=categories,
                               items=items, event_notes=event_notes, invitees=invitees,
                               invitee_stats=invitee_stats, event_photos=event_photos)


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

    event_notes = db.execute(
        'SELECT * FROM event_note WHERE meal_plan_id = ? ORDER BY created_at DESC',
        (plan_id,)
    ).fetchall()
    return render_template('meal_plan_form.html', plan=plan, items=items, recipes=recipes,
                           days=WEEKLY_DAYS, meals=WEEKLY_MEALS, courses=EVENT_COURSES,
                           event_notes=event_notes)


@app.route('/plan/<int:plan_id>/delete', methods=['POST'])
def plan_delete(plan_id):
    db = get_db()
    plan = db.execute('SELECT plan_type FROM meal_plan WHERE id = ?', (plan_id,)).fetchone()
    db.execute('DELETE FROM meal_plan WHERE id = ?', (plan_id,))
    db.commit()
    flash('Plan deleted.')
    if plan and plan['plan_type'] == 'event':
        return redirect(url_for('event_plan_list'))
    return redirect(url_for('meal_plan_list'))


def save_plan(plan_id):
    db = get_db()
    name = request.form.get('name', '').strip()
    plan_type = request.form.get('plan_type', 'weekly')
    event_date = request.form.get('event_date', '').strip() or None
    event_time = request.form.get('event_time', '').strip() or None

    if not name:
        flash('Plan name is required.')
        return redirect(request.url)

    if plan_id is None:
        cur = db.execute(
            'INSERT INTO meal_plan (name, plan_type, event_date, event_time) VALUES (?, ?, ?, ?)',
            (name, plan_type, event_date, event_time)
        )
        plan_id = cur.lastrowid
    else:
        db.execute('UPDATE meal_plan SET name = ?, plan_type = ?, event_date = ?, event_time = ? WHERE id = ?',
                   (name, plan_type, event_date, event_time, plan_id))

    # Clear existing items and re-add
    db.execute('DELETE FROM meal_plan_item WHERE meal_plan_id = ?', (plan_id,))

    # Items come as parallel arrays
    slot_labels = request.form.getlist('slot_label')
    recipe_ids = request.form.getlist('recipe_id')
    free_texts = request.form.getlist('free_text')
    servings_list = request.form.getlist('servings_override')

    for i, slot in enumerate(slot_labels):
        rid = recipe_ids[i].strip() if i < len(recipe_ids) else ''
        free_text = free_texts[i].strip() if i < len(free_texts) else ''

        # Skip rows with no recipe and no free text
        if not rid and not free_text:
            continue

        recipe_id = None
        if rid:
            try:
                recipe_id = int(rid)
            except ValueError:
                pass

        servings = None
        if i < len(servings_list) and servings_list[i].strip():
            try:
                servings = int(servings_list[i])
            except ValueError:
                pass

        db.execute(
            '''INSERT INTO meal_plan_item (meal_plan_id, recipe_id, free_text, slot_label, servings_override, sort_order)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (plan_id, recipe_id, free_text or None, slot, servings, i)
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


# ── Meal Plan Items (inline add/remove) ───────────────────────────────────────

@app.route('/plan/<int:plan_id>/add-item', methods=['POST'])
def plan_item_add(plan_id):
    db = get_db()
    day = request.form.get('day', '').strip()
    meal = request.form.get('meal', '').strip()
    recipe_id = request.form.get('recipe_id', '').strip()
    free_text = request.form.get('free_text', '').strip()

    if not day or not meal or (not recipe_id and not free_text):
        flash('Please select a meal type and enter a dish or pick a recipe.')
        return redirect(url_for('plan_detail', plan_id=plan_id))

    slot_label = f'{day} — {meal}'
    rid = int(recipe_id) if recipe_id else None

    max_order = db.execute(
        'SELECT COALESCE(MAX(sort_order), 0) as m FROM meal_plan_item WHERE meal_plan_id = ?',
        (plan_id,)
    ).fetchone()['m']

    db.execute(
        '''INSERT INTO meal_plan_item (meal_plan_id, recipe_id, free_text, slot_label, sort_order)
           VALUES (?, ?, ?, ?, ?)''',
        (plan_id, rid, free_text or None, slot_label, max_order + 1)
    )
    db.commit()
    return redirect(url_for('plan_detail', plan_id=plan_id))


@app.route('/plan/item/<int:item_id>/delete', methods=['POST'])
def plan_item_delete(item_id):
    db = get_db()
    item = db.execute('SELECT meal_plan_id FROM meal_plan_item WHERE id = ?', (item_id,)).fetchone()
    if item is None:
        flash('Item not found.')
        return redirect(url_for('meal_plan_list'))
    db.execute('DELETE FROM meal_plan_item WHERE id = ?', (item_id,))
    db.commit()
    return redirect(url_for('plan_detail', plan_id=item['meal_plan_id']))


# ── Meal Plan Day Notes ──────────────────────────────────────────────────────

@app.route('/plan/<int:plan_id>/day-note', methods=['POST'])
def day_note_save(plan_id):
    db = get_db()
    day = request.form.get('day', '').strip()
    content = request.form.get('content', '').strip()
    if not day:
        return redirect(url_for('plan_detail', plan_id=plan_id))

    existing = db.execute(
        'SELECT id FROM meal_plan_day_note WHERE meal_plan_id = ? AND day = ?',
        (plan_id, day)
    ).fetchone()

    if content:
        if existing:
            db.execute('UPDATE meal_plan_day_note SET content = ? WHERE id = ?',
                       (content, existing['id']))
        else:
            db.execute('INSERT INTO meal_plan_day_note (meal_plan_id, day, content) VALUES (?, ?, ?)',
                       (plan_id, day, content))
    elif existing:
        db.execute('DELETE FROM meal_plan_day_note WHERE id = ?', (existing['id'],))

    db.commit()
    return redirect(url_for('plan_detail', plan_id=plan_id))


# ── Event Photos ──────────────────────────────────────────────────────────────

@app.route('/plan/<int:plan_id>/photo', methods=['POST'])
def event_photo_upload(plan_id):
    db = get_db()
    file = request.files.get('photo')
    if not file or not file.filename:
        flash('No photo selected.')
        return redirect(url_for('plan_detail', plan_id=plan_id))

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
        flash('Unsupported image format.')
        return redirect(url_for('plan_detail', plan_id=plan_id))

    filename = f'event_{uuid.uuid4().hex}{ext}'
    filepath = os.path.join(PHOTO_DIR, filename)
    file.save(filepath)

    try:
        img = Image.open(filepath)
        img = ImageOps.exif_transpose(img)
        img.save(filepath)
        thumb = img.copy()
        thumb.thumbnail(THUMB_SIZE)
        thumb.save(os.path.join(PHOTO_DIR, f'thumb_{filename}'))
    except Exception:
        pass

    caption = request.form.get('caption', '').strip()
    db.execute(
        'INSERT INTO event_photo (meal_plan_id, filename, caption) VALUES (?, ?, ?)',
        (plan_id, filename, caption or None)
    )
    db.commit()
    flash('Photo uploaded!')
    return redirect(url_for('plan_detail', plan_id=plan_id))


@app.route('/event-photo/<int:photo_id>/delete', methods=['POST'])
def event_photo_delete(photo_id):
    db = get_db()
    photo = db.execute('SELECT * FROM event_photo WHERE id = ?', (photo_id,)).fetchone()
    if photo is None:
        flash('Photo not found.')
        return redirect(url_for('event_plan_list'))

    for prefix in ('', 'thumb_'):
        path = os.path.join(PHOTO_DIR, prefix + photo['filename'])
        if os.path.exists(path):
            os.remove(path)

    db.execute('DELETE FROM event_photo WHERE id = ?', (photo_id,))
    db.commit()
    flash('Photo deleted.')
    return redirect(url_for('plan_detail', plan_id=photo['meal_plan_id']))


# ── Event Invitees ────────────────────────────────────────────────────────────

@app.route('/plan/<int:plan_id>/invitee', methods=['POST'])
def invitee_add(plan_id):
    db = get_db()
    name = request.form.get('name', '').strip()
    dietary = request.form.get('dietary', '').strip()
    if not name:
        flash('Invitee name is required.')
        return redirect(url_for('plan_detail', plan_id=plan_id))
    db.execute(
        'INSERT INTO event_invitee (meal_plan_id, name, dietary) VALUES (?, ?, ?)',
        (plan_id, name, dietary or None)
    )
    db.commit()
    return redirect(url_for('plan_detail', plan_id=plan_id))


@app.route('/invitee/<int:invitee_id>/update', methods=['POST'])
def invitee_update(invitee_id):
    db = get_db()
    invitee = db.execute('SELECT * FROM event_invitee WHERE id = ?', (invitee_id,)).fetchone()
    if invitee is None:
        flash('Invitee not found.')
        return redirect(url_for('event_plan_list'))

    invite_sent = 1 if request.form.get('invite_sent') else 0
    rsvp = request.form.get('rsvp', 'pending')
    dietary = request.form.get('dietary', '').strip()
    db.execute(
        'UPDATE event_invitee SET invite_sent = ?, rsvp = ?, dietary = ? WHERE id = ?',
        (invite_sent, rsvp, dietary or None, invitee_id)
    )
    db.commit()
    return redirect(url_for('plan_detail', plan_id=invitee['meal_plan_id']))


@app.route('/invitee/<int:invitee_id>/delete', methods=['POST'])
def invitee_delete(invitee_id):
    db = get_db()
    invitee = db.execute('SELECT * FROM event_invitee WHERE id = ?', (invitee_id,)).fetchone()
    if invitee is None:
        flash('Invitee not found.')
        return redirect(url_for('event_plan_list'))
    db.execute('DELETE FROM event_invitee WHERE id = ?', (invitee_id,))
    db.commit()
    return redirect(url_for('plan_detail', plan_id=invitee['meal_plan_id']))


# ── Event Notes ───────────────────────────────────────────────────────────────

@app.route('/plan/<int:plan_id>/event-note', methods=['POST'])
def event_note_add(plan_id):
    content = request.form.get('content', '').strip()
    if not content:
        flash('Note cannot be empty.')
        return redirect(url_for('plan_detail', plan_id=plan_id))
    db = get_db()
    db.execute('INSERT INTO event_note (meal_plan_id, content) VALUES (?, ?)', (plan_id, content))
    db.commit()
    return redirect(url_for('plan_detail', plan_id=plan_id))


@app.route('/event-note/<int:note_id>/delete', methods=['POST'])
def event_note_delete(note_id):
    db = get_db()
    note = db.execute('SELECT * FROM event_note WHERE id = ?', (note_id,)).fetchone()
    if note is None:
        flash('Note not found.')
        return redirect(url_for('event_plan_list'))
    db.execute('DELETE FROM event_note WHERE id = ?', (note_id,))
    db.commit()
    return redirect(url_for('plan_detail', plan_id=note['meal_plan_id']))


# ── Gift Ideas ────────────────────────────────────────────────────────────────

def _hamper_stats(db, hamper_id):
    items = db.execute(
        'SELECT * FROM gift_hamper_item WHERE hamper_id = ? ORDER BY sort_order, id',
        (hamper_id,)
    ).fetchall()
    total = len(items)
    done = sum(1 for i in items if i['checked'])
    return items, total, done


@app.route('/gifts')
def gift_list():
    from datetime import date
    db = get_db()
    today = date.today().isoformat()

    upcoming = db.execute("""
        SELECT * FROM gift_hamper
        WHERE gift_date >= ? OR gift_date IS NULL
        ORDER BY CASE WHEN gift_date IS NULL THEN 1 ELSE 0 END,
                 gift_date ASC, created_at DESC
    """, (today,)).fetchall()

    past = db.execute("""
        SELECT * FROM gift_hamper WHERE gift_date < ?
        ORDER BY gift_date DESC
    """, (today,)).fetchall()

    hamper_stats = {}
    for h in list(upcoming) + list(past):
        _, total, done = _hamper_stats(db, h['id'])
        hamper_stats[h['id']] = {'total': total, 'done': done}

    return render_template('gifts.html', upcoming=upcoming, past=past,
                           hamper_stats=hamper_stats)


@app.route('/gift/<int:hamper_id>')
def gift_detail(hamper_id):
    db = get_db()
    # Auto-create gift_note table if it doesn't exist yet
    db.execute('''CREATE TABLE IF NOT EXISTS gift_note (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hamper_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hamper_id) REFERENCES gift_hamper(id) ON DELETE CASCADE
    )''')
    hamper = db.execute('SELECT * FROM gift_hamper WHERE id = ?', (hamper_id,)).fetchone()
    if hamper is None:
        flash('Gift list not found.')
        return redirect(url_for('gift_list'))
    items, total, done = _hamper_stats(db, hamper_id)
    photos = db.execute(
        'SELECT * FROM gift_photo WHERE hamper_id = ? ORDER BY created_at', (hamper_id,)
    ).fetchall()
    notes = db.execute(
        'SELECT * FROM gift_note WHERE hamper_id = ? ORDER BY created_at DESC', (hamper_id,)
    ).fetchall()
    return render_template('gift_detail.html', hamper=hamper, items=items,
                           total=total, done=done, photos=photos, notes=notes)


@app.route('/gift/<int:hamper_id>/note/add', methods=['POST'])
def gift_note_add(hamper_id):
    content = request.form.get('content', '').strip()
    if not content:
        flash('Note cannot be empty.')
        return redirect(url_for('gift_detail', hamper_id=hamper_id))
    db = get_db()
    db.execute('INSERT INTO gift_note (hamper_id, content) VALUES (?, ?)', (hamper_id, content))
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=hamper_id))


@app.route('/gift/note/<int:note_id>/edit', methods=['GET', 'POST'])
def gift_note_edit(note_id):
    db = get_db()
    note = db.execute('SELECT * FROM gift_note WHERE id = ?', (note_id,)).fetchone()
    if note is None:
        flash('Note not found.')
        return redirect(url_for('gift_list'))

    if request.method == 'POST':
        content = request.form.get('content', '').strip()
        if not content:
            flash('Note cannot be empty.')
            return redirect(url_for('gift_detail', hamper_id=note['hamper_id']))
        db.execute('UPDATE gift_note SET content = ? WHERE id = ?', (content, note_id))
        db.commit()
        return redirect(url_for('gift_detail', hamper_id=note['hamper_id']))

    return render_template('gift_note_edit.html', note=note)


@app.route('/gift/note/<int:note_id>/delete', methods=['POST'])
def gift_note_delete(note_id):
    db = get_db()
    note = db.execute('SELECT * FROM gift_note WHERE id = ?', (note_id,)).fetchone()
    hamper_id = note['hamper_id'] if note else None
    db.execute('DELETE FROM gift_note WHERE id = ?', (note_id,))
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=hamper_id) if hamper_id else url_for('gift_list'))


@app.route('/gift/new', methods=['POST'])
def gift_hamper_new():
    db = get_db()
    title = request.form.get('title', '').strip()
    gift_date = request.form.get('gift_date', '').strip() or None
    if not title:
        flash('Title is required.')
        return redirect(url_for('gift_list'))
    db.execute('INSERT INTO gift_hamper (title, gift_date) VALUES (?, ?)', (title, gift_date))
    db.commit()
    return redirect(url_for('gift_list'))


@app.route('/gift/<int:hamper_id>/add-item', methods=['POST'])
def gift_item_add(hamper_id):
    db = get_db()
    description = request.form.get('description', '').strip()
    note = request.form.get('note', '').strip()
    if not description:
        flash('Item description is required.')
        return redirect(url_for('gift_detail', hamper_id=hamper_id))
    max_order = db.execute(
        'SELECT COALESCE(MAX(sort_order), 0) as m FROM gift_hamper_item WHERE hamper_id = ?',
        (hamper_id,)
    ).fetchone()['m']
    db.execute(
        'INSERT INTO gift_hamper_item (hamper_id, description, note, sort_order) VALUES (?, ?, ?, ?)',
        (hamper_id, description, note or None, max_order + 1)
    )
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=hamper_id))


@app.route('/gift/item/<int:item_id>/toggle', methods=['POST'])
def gift_item_toggle(item_id):
    db = get_db()
    item = db.execute('SELECT hamper_id FROM gift_hamper_item WHERE id = ?', (item_id,)).fetchone()
    db.execute('UPDATE gift_hamper_item SET checked = NOT checked WHERE id = ?', (item_id,))
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=item['hamper_id']))


@app.route('/gift/item/<int:item_id>/note', methods=['POST'])
def gift_item_note(item_id):
    db = get_db()
    item = db.execute('SELECT hamper_id FROM gift_hamper_item WHERE id = ?', (item_id,)).fetchone()
    note = request.form.get('note', '').strip()
    db.execute('UPDATE gift_hamper_item SET note = ? WHERE id = ?', (note or None, item_id))
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=item['hamper_id']))


@app.route('/gift/item/<int:item_id>/delete', methods=['POST'])
def gift_item_delete(item_id):
    db = get_db()
    item = db.execute('SELECT hamper_id FROM gift_hamper_item WHERE id = ?', (item_id,)).fetchone()
    db.execute('DELETE FROM gift_hamper_item WHERE id = ?', (item_id,))
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=item['hamper_id']))


@app.route('/gift/<int:hamper_id>/update-date', methods=['POST'])
def gift_hamper_update_date(hamper_id):
    db = get_db()
    gift_date = request.form.get('gift_date', '').strip() or None
    db.execute('UPDATE gift_hamper SET gift_date = ? WHERE id = ?', (gift_date, hamper_id))
    db.commit()
    return redirect(url_for('gift_detail', hamper_id=hamper_id))


@app.route('/gift/<int:hamper_id>/photo', methods=['POST'])
def gift_photo_upload(hamper_id):
    db = get_db()
    file = request.files.get('photo')
    if not file or not file.filename:
        flash('No photo selected.')
        return redirect(url_for('gift_detail', hamper_id=hamper_id))

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
        flash('Unsupported image format.')
        return redirect(url_for('gift_detail', hamper_id=hamper_id))

    filename = f'gift_{uuid.uuid4().hex}{ext}'
    filepath = os.path.join(PHOTO_DIR, filename)
    file.save(filepath)

    try:
        img = Image.open(filepath)
        img = ImageOps.exif_transpose(img)
        img.save(filepath)
        thumb = img.copy()
        thumb.thumbnail(THUMB_SIZE)
        thumb.save(os.path.join(PHOTO_DIR, f'thumb_{filename}'))
    except Exception:
        pass

    caption = request.form.get('caption', '').strip()
    db.execute(
        'INSERT INTO gift_photo (hamper_id, filename, caption) VALUES (?, ?, ?)',
        (hamper_id, filename, caption or None)
    )
    db.commit()
    flash('Photo uploaded!')
    return redirect(url_for('gift_detail', hamper_id=hamper_id))


@app.route('/gift/photo/<int:photo_id>/delete', methods=['POST'])
def gift_photo_delete(photo_id):
    db = get_db()
    photo = db.execute('SELECT * FROM gift_photo WHERE id = ?', (photo_id,)).fetchone()
    if photo is None:
        flash('Photo not found.')
        return redirect(url_for('gift_list'))

    for prefix in ('', 'thumb_'):
        path = os.path.join(PHOTO_DIR, prefix + photo['filename'])
        if os.path.exists(path):
            os.remove(path)

    db.execute('DELETE FROM gift_photo WHERE id = ?', (photo_id,))
    db.commit()
    flash('Photo deleted.')
    return redirect(url_for('gift_detail', hamper_id=photo['hamper_id']))


@app.route('/gift/<int:hamper_id>/delete', methods=['POST'])
def gift_hamper_delete(hamper_id):
    db = get_db()
    db.execute('DELETE FROM gift_hamper WHERE id = ?', (hamper_id,))
    db.commit()
    flash('Gift list deleted.')
    return redirect(url_for('gift_list'))


# ── Brain Dump ───────────────────────────────────────────────────────────────

@app.route('/braindump')
def braindump():
    db = get_db()
    # Auto-create table if it doesn't exist yet
    db.execute('''CREATE TABLE IF NOT EXISTS braindump (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    notes = db.execute('SELECT * FROM braindump ORDER BY created_at DESC').fetchall()
    return render_template('braindump.html', notes=notes)


@app.route('/braindump/add', methods=['POST'])
def braindump_add():
    content = request.form.get('content', '').strip()
    if not content:
        flash('Note cannot be empty.')
        return redirect(url_for('braindump'))
    db = get_db()
    db.execute('INSERT INTO braindump (content) VALUES (?)', (content,))
    db.commit()
    return redirect(url_for('braindump'))


@app.route('/braindump/<int:note_id>/edit', methods=['GET', 'POST'])
def braindump_edit(note_id):
    db = get_db()
    if request.method == 'POST':
        content = request.form.get('content', '').strip()
        if not content:
            flash('Note cannot be empty.')
            return redirect(url_for('braindump'))
        db.execute('UPDATE braindump SET content = ? WHERE id = ?', (content, note_id))
        db.commit()
        return redirect(url_for('braindump'))

    note = db.execute('SELECT * FROM braindump WHERE id = ?', (note_id,)).fetchone()
    if note is None:
        flash('Note not found.')
        return redirect(url_for('braindump'))
    return render_template('braindump_edit.html', note=note)


@app.route('/braindump/<int:note_id>/delete', methods=['POST'])
def braindump_delete(note_id):
    db = get_db()
    db.execute('DELETE FROM braindump WHERE id = ?', (note_id,))
    db.commit()
    return redirect(url_for('braindump'))


# ── PWA service-worker (must be served from root scope) ───────────────────────

@app.route('/sw.js')
def service_worker():
    return send_from_directory(app.static_folder, 'sw.js',
                               mimetype='application/javascript')


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys
    debug = '--debug' in sys.argv
    app.run(debug=debug, host='0.0.0.0', port=8080)
