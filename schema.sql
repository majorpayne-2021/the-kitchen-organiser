CREATE TABLE IF NOT EXISTS recipe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    source TEXT,
    steps TEXT,  -- JSON array of strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredient (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    grocery_category TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipe_tag (
    recipe_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    caption TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'weekly',  -- 'weekly' or 'event'
    event_date TEXT,  -- date for event plans
    event_time TEXT,  -- time for event plans (HH:MM)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_plan_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    recipe_id INTEGER,           -- NULL for free-text items
    free_text TEXT,              -- free-text item name (when no recipe linked)
    slot_label TEXT NOT NULL,     -- e.g. 'Monday Dinner' or 'Savoury'
    servings_override INTEGER,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plan(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plan_day_note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_photo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_invitee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    invite_sent INTEGER DEFAULT 0,
    rsvp TEXT DEFAULT 'pending',  -- 'pending', 'attending', 'not attending'
    dietary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gift_idea (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    idea TEXT NOT NULL,
    occasion TEXT,
    purchased INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_hamper (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    gift_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_photo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hamper_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hamper_id) REFERENCES gift_hamper(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS braindump (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_hamper_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hamper_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    note TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (hamper_id) REFERENCES gift_hamper(id) ON DELETE CASCADE
);
