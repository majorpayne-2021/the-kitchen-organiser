/**
 * One-time data migration from old SQLite recipes.db to new kitchen-organiser DB.
 *
 * Uses better-sqlite3 for both read (old DB) and write (new DB) to avoid the
 * @libsql/client WASM startup cost in non-Next.js environments.
 *
 * Run: npx tsx scripts/migrate-data.ts
 */

import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const OLD_DB_PATH = join(
  PROJECT_ROOT,
  "..",
  "resources",
  "kitchen-organiser-privatedata",
  "recipes.db"
);
const OLD_PHOTOS_DIR = join(
  PROJECT_ROOT,
  "..",
  "resources",
  "kitchen-organiser-privatedata",
  "photos"
);
const NEW_DB_PATH = join(PROJECT_ROOT, "dev.db");
const NEW_PHOTOS_DIR = join(PROJECT_ROOT, "public", "photos");

if (!existsSync(OLD_DB_PATH)) {
  console.error("Old database not found at:", OLD_DB_PATH);
  process.exit(1);
}

if (!existsSync(NEW_PHOTOS_DIR)) {
  mkdirSync(NEW_PHOTOS_DIR, { recursive: true });
}

const oldDb = new Database(OLD_DB_PATH, { readonly: true });
const newDb = new Database(NEW_DB_PATH);

// Enable WAL mode for performance
newDb.pragma("journal_mode = WAL");
newDb.pragma("foreign_keys = OFF");

function copyPhoto(filename: string): boolean {
  const src = join(OLD_PHOTOS_DIR, filename);
  const dst = join(NEW_PHOTOS_DIR, filename);
  if (existsSync(src) && !existsSync(dst)) {
    try {
      copyFileSync(src, dst);
      return true;
    } catch {
      console.warn(`  Could not copy ${filename}`);
      return false;
    }
  }
  return existsSync(dst);
}

function hasTable(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    )
    .get(name) as { name: string } | undefined;
  return !!row;
}

// Check if migration already ran
const existingRecipes = (
  newDb.prepare("SELECT count(*) as c FROM Recipe").get() as { c: number }
).c;
if (existingRecipes > 0) {
  console.log(
    `Migration already ran: found ${existingRecipes} recipes. Exiting.`
  );
  process.exit(0);
}

console.log("Starting migration...");
console.log("  Source:", OLD_DB_PATH);
console.log("  Target:", NEW_DB_PATH);

const migrateAll = newDb.transaction(() => {
  const recipeIdMap = new Map<number, number>();

  // --- Recipes ---
  const oldRecipes = oldDb
    .prepare(
      `SELECT id, title, description, prep_time, cook_time, servings, source, steps, created_at, updated_at FROM recipe`
    )
    .all() as any[];
  console.log(`\nMigrating ${oldRecipes.length} recipes...`);

  const insertRecipe = newDb.prepare(
    `INSERT INTO Recipe (title, description, prepTime, cookTime, servings, source, steps, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const r of oldRecipes) {
    const result = insertRecipe.run(
      r.title,
      r.description ?? null,
      r.prep_time ?? null,
      r.cook_time ?? null,
      r.servings ?? null,
      r.source ?? null,
      r.steps ?? null,
      r.created_at ?? new Date().toISOString(),
      r.updated_at ?? new Date().toISOString()
    );
    recipeIdMap.set(r.id, Number(result.lastInsertRowid));
  }
  console.log(`  Done: ${recipeIdMap.size} recipes`);

  // --- Ingredients ---
  const oldIngredients = oldDb
    .prepare(
      `SELECT id, recipe_id, name, quantity, unit, grocery_category, sort_order FROM ingredient`
    )
    .all() as any[];
  console.log(`Migrating ${oldIngredients.length} ingredients...`);

  const insertIngredient = newDb.prepare(
    `INSERT INTO Ingredient (recipeId, name, quantity, unit, groceryCategory, sortOrder) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const ing of oldIngredients) {
    const newRecipeId = recipeIdMap.get(ing.recipe_id);
    if (!newRecipeId) continue;
    insertIngredient.run(
      newRecipeId,
      ing.name,
      ing.quantity ?? null,
      ing.unit ?? null,
      ing.grocery_category ?? null,
      ing.sort_order ?? 0
    );
  }
  console.log(`  Done`);

  // --- Recipe Photos ---
  const oldPhotos = oldDb
    .prepare(
      `SELECT id, recipe_id, filename, caption, is_primary, created_at FROM photo`
    )
    .all() as any[];
  console.log(`Migrating ${oldPhotos.length} recipe photos...`);

  const insertPhoto = newDb.prepare(
    `INSERT INTO Photo (recipeId, filename, caption, isPrimary, createdAt) VALUES (?, ?, ?, ?, ?)`
  );
  let photosCopied = 0;
  for (const p of oldPhotos) {
    const newRecipeId = recipeIdMap.get(p.recipe_id);
    if (!newRecipeId) continue;
    if (copyPhoto(p.filename)) photosCopied++;
    copyPhoto(`thumb_${p.filename}`);
    insertPhoto.run(
      newRecipeId,
      p.filename,
      p.caption ?? null,
      p.is_primary ? 1 : 0,
      p.created_at ?? new Date().toISOString()
    );
  }
  console.log(`  Done: ${photosCopied} photo files copied`);

  // --- Notes ---
  const oldNotes = oldDb
    .prepare(
      `SELECT id, recipe_id, content, created_at FROM note`
    )
    .all() as any[];
  console.log(`Migrating ${oldNotes.length} notes...`);

  const insertNote = newDb.prepare(
    `INSERT INTO Note (recipeId, content, createdAt) VALUES (?, ?, ?)`
  );
  for (const n of oldNotes) {
    const newRecipeId = recipeIdMap.get(n.recipe_id);
    if (!newRecipeId) continue;
    insertNote.run(newRecipeId, n.content, n.created_at ?? new Date().toISOString());
  }
  console.log(`  Done`);

  // --- Tags ---
  const oldTags = hasTable(oldDb, "tag")
    ? (oldDb.prepare(`SELECT id, name FROM tag`).all() as any[])
    : [];
  console.log(`Migrating ${oldTags.length} tags...`);

  const tagIdMap = new Map<number, number>();
  const insertTag = newDb.prepare(
    `INSERT OR IGNORE INTO Tag (name) VALUES (?)`
  );
  const getTag = newDb.prepare(`SELECT id FROM Tag WHERE name = ?`);
  for (const t of oldTags) {
    insertTag.run(t.name);
    const row = getTag.get(t.name) as { id: number };
    if (row) tagIdMap.set(t.id, row.id);
  }
  console.log(`  Done: ${tagIdMap.size} tags`);

  // --- Recipe Tags ---
  const oldRecipeTags = hasTable(oldDb, "recipe_tag")
    ? (oldDb.prepare(`SELECT recipe_id, tag_id FROM recipe_tag`).all() as any[])
    : [];
  console.log(`Migrating ${oldRecipeTags.length} recipe-tag links...`);

  const insertRecipeTag = newDb.prepare(
    `INSERT OR IGNORE INTO RecipeTag (recipeId, tagId) VALUES (?, ?)`
  );
  for (const rt of oldRecipeTags) {
    const newRecipeId = recipeIdMap.get(rt.recipe_id);
    const newTagId = tagIdMap.get(rt.tag_id);
    if (!newRecipeId || !newTagId) continue;
    insertRecipeTag.run(newRecipeId, newTagId);
  }
  console.log(`  Done`);

  // --- Meal Plans ---
  const oldMealPlans = hasTable(oldDb, "meal_plan")
    ? (oldDb
        .prepare(
          `SELECT id, name, plan_type, event_date, event_time, created_at FROM meal_plan`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldMealPlans.length} meal plans...`);

  const mealPlanIdMap = new Map<number, number>();
  const insertMealPlan = newDb.prepare(
    `INSERT INTO MealPlan (name, planType, eventDate, eventTime, createdAt) VALUES (?, ?, ?, ?, ?)`
  );
  for (const mp of oldMealPlans) {
    const result = insertMealPlan.run(
      mp.name,
      mp.plan_type ?? "weekly",
      mp.event_date ?? null,
      mp.event_time ?? null,
      mp.created_at ?? new Date().toISOString()
    );
    mealPlanIdMap.set(mp.id, Number(result.lastInsertRowid));
  }
  console.log(`  Done`);

  // --- Meal Plan Items ---
  const oldMealPlanItems = hasTable(oldDb, "meal_plan_item")
    ? (oldDb
        .prepare(
          `SELECT id, meal_plan_id, recipe_id, free_text, slot_label, servings_override, sort_order FROM meal_plan_item`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldMealPlanItems.length} meal plan items...`);

  const insertMealPlanItem = newDb.prepare(
    `INSERT INTO MealPlanItem (mealPlanId, recipeId, freeText, slotLabel, servingsOverride, sortOrder) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const item of oldMealPlanItems) {
    const newMealPlanId = mealPlanIdMap.get(item.meal_plan_id);
    if (!newMealPlanId) continue;
    const newRecipeId = item.recipe_id
      ? recipeIdMap.get(item.recipe_id) ?? null
      : null;
    insertMealPlanItem.run(
      newMealPlanId,
      newRecipeId,
      item.free_text ?? null,
      item.slot_label,
      item.servings_override ?? null,
      item.sort_order ?? 0
    );
  }
  console.log(`  Done`);

  // --- Day Notes ---
  const oldDayNotes = hasTable(oldDb, "meal_plan_day_note")
    ? (oldDb
        .prepare(`SELECT id, meal_plan_id, day, content FROM meal_plan_day_note`)
        .all() as any[])
    : [];
  console.log(`Migrating ${oldDayNotes.length} day notes...`);

  const insertDayNote = newDb.prepare(
    `INSERT INTO MealPlanDayNote (mealPlanId, day, content) VALUES (?, ?, ?)`
  );
  for (const dn of oldDayNotes) {
    const newMealPlanId = mealPlanIdMap.get(dn.meal_plan_id);
    if (!newMealPlanId) continue;
    insertDayNote.run(newMealPlanId, dn.day, dn.content);
  }
  console.log(`  Done`);

  // --- Event Notes ---
  const oldEventNotes = hasTable(oldDb, "event_note")
    ? (oldDb
        .prepare(
          `SELECT id, meal_plan_id, content, created_at FROM event_note`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldEventNotes.length} event notes...`);

  const insertEventNote = newDb.prepare(
    `INSERT INTO EventNote (mealPlanId, content, createdAt) VALUES (?, ?, ?)`
  );
  for (const en of oldEventNotes) {
    const newMealPlanId = mealPlanIdMap.get(en.meal_plan_id);
    if (!newMealPlanId) continue;
    insertEventNote.run(
      newMealPlanId,
      en.content,
      en.created_at ?? new Date().toISOString()
    );
  }
  console.log(`  Done`);

  // --- Event Photos ---
  const oldEventPhotos = hasTable(oldDb, "event_photo")
    ? (oldDb
        .prepare(
          `SELECT id, meal_plan_id, filename, caption, created_at FROM event_photo`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldEventPhotos.length} event photos...`);

  const insertEventPhoto = newDb.prepare(
    `INSERT INTO EventPhoto (mealPlanId, filename, caption, createdAt) VALUES (?, ?, ?, ?)`
  );
  for (const ep of oldEventPhotos) {
    const newMealPlanId = mealPlanIdMap.get(ep.meal_plan_id);
    if (!newMealPlanId) continue;
    copyPhoto(ep.filename);
    copyPhoto(`thumb_${ep.filename}`);
    insertEventPhoto.run(
      newMealPlanId,
      ep.filename,
      ep.caption ?? null,
      ep.created_at ?? new Date().toISOString()
    );
  }
  console.log(`  Done`);

  // --- Invitees ---
  const oldInvitees = hasTable(oldDb, "event_invitee")
    ? (oldDb
        .prepare(
          `SELECT id, meal_plan_id, name, invite_sent, rsvp, dietary, created_at FROM event_invitee`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldInvitees.length} invitees...`);

  const insertInvitee = newDb.prepare(
    `INSERT INTO EventInvitee (mealPlanId, name, inviteSent, rsvp, dietary, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const inv of oldInvitees) {
    const newMealPlanId = mealPlanIdMap.get(inv.meal_plan_id);
    if (!newMealPlanId) continue;
    insertInvitee.run(
      newMealPlanId,
      inv.name,
      inv.invite_sent ? 1 : 0,
      inv.rsvp ?? "pending",
      inv.dietary ?? null,
      inv.created_at ?? new Date().toISOString()
    );
  }
  console.log(`  Done`);

  // --- Gift Hampers ---
  const oldHampers = hasTable(oldDb, "gift_hamper")
    ? (oldDb
        .prepare(
          `SELECT id, title, gift_date, created_at FROM gift_hamper`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldHampers.length} gift hampers...`);

  const hamperIdMap = new Map<number, number>();
  const insertHamper = newDb.prepare(
    `INSERT INTO GiftHamper (title, giftDate, createdAt) VALUES (?, ?, ?)`
  );
  for (const h of oldHampers) {
    const result = insertHamper.run(
      h.title,
      h.gift_date ?? null,
      h.created_at ?? new Date().toISOString()
    );
    hamperIdMap.set(h.id, Number(result.lastInsertRowid));
  }
  console.log(`  Done`);

  // --- Gift Items ---
  const oldGiftItems = hasTable(oldDb, "gift_hamper_item")
    ? (oldDb
        .prepare(
          `SELECT id, hamper_id, description, checked, note, sort_order FROM gift_hamper_item`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldGiftItems.length} gift items...`);

  const insertGiftItem = newDb.prepare(
    `INSERT INTO GiftHamperItem (hamperId, description, checked, note, sortOrder) VALUES (?, ?, ?, ?, ?)`
  );
  for (const gi of oldGiftItems) {
    const newHamperId = hamperIdMap.get(gi.hamper_id);
    if (!newHamperId) continue;
    insertGiftItem.run(
      newHamperId,
      gi.description,
      gi.checked ? 1 : 0,
      gi.note ?? null,
      gi.sort_order ?? 0
    );
  }
  console.log(`  Done`);

  // --- Gift Photos ---
  const oldGiftPhotos = hasTable(oldDb, "gift_photo")
    ? (oldDb
        .prepare(
          `SELECT id, hamper_id, filename, caption, created_at FROM gift_photo`
        )
        .all() as any[])
    : [];
  console.log(`Migrating ${oldGiftPhotos.length} gift photos...`);

  const insertGiftPhoto = newDb.prepare(
    `INSERT INTO GiftPhoto (hamperId, filename, caption, createdAt) VALUES (?, ?, ?, ?)`
  );
  for (const gp of oldGiftPhotos) {
    const newHamperId = hamperIdMap.get(gp.hamper_id);
    if (!newHamperId) continue;
    copyPhoto(gp.filename);
    copyPhoto(`thumb_${gp.filename}`);
    insertGiftPhoto.run(
      newHamperId,
      gp.filename,
      gp.caption ?? null,
      gp.created_at ?? new Date().toISOString()
    );
  }
  console.log(`  Done`);

  // --- Braindump ---
  const oldBraindump = hasTable(oldDb, "braindump")
    ? (oldDb
        .prepare(`SELECT id, content, created_at FROM braindump`)
        .all() as any[])
    : [];
  console.log(`Migrating ${oldBraindump.length} braindump entries...`);

  const insertBraindump = newDb.prepare(
    `INSERT INTO Braindump (content, createdAt) VALUES (?, ?)`
  );
  for (const bd of oldBraindump) {
    insertBraindump.run(bd.content, bd.created_at ?? new Date().toISOString());
  }
  console.log(`  Done`);

  return {
    recipes: recipeIdMap.size,
    tags: tagIdMap.size,
    mealPlans: mealPlanIdMap.size,
    hampers: hamperIdMap.size,
    photosCopied,
  };
});

try {
  const stats = migrateAll();

  // Summary
  const recipeCount = (
    newDb.prepare("SELECT count(*) as c FROM Recipe").get() as { c: number }
  ).c;
  const photoDbCount = (
    newDb.prepare("SELECT count(*) as c FROM Photo").get() as { c: number }
  ).c;
  const mealPlanCount = (
    newDb.prepare("SELECT count(*) as c FROM MealPlan").get() as { c: number }
  ).c;

  console.log("\n=== Migration Complete ===");
  console.log(`Recipes:        ${recipeCount}`);
  console.log(`Photo DB rows:  ${photoDbCount}`);
  console.log(`Photos copied:  ${stats.photosCopied}`);
  console.log(`Meal Plans:     ${mealPlanCount}`);
  console.log(`Tags:           ${stats.tags}`);
  console.log(`Gift Hampers:   ${stats.hampers}`);
} finally {
  oldDb.close();
  newDb.close();
}
