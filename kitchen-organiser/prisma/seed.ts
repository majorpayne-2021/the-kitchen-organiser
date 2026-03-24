/**
 * Seed default users (Jennifer, Matus).
 *
 * Uses better-sqlite3 directly to avoid @libsql/client WASM startup in
 * non-Next.js environments (e.g. CLI scripts).
 *
 * Run: npx prisma db seed
 */
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// dev.db lives at project root (one level above prisma/)
const DB_PATH = join(__dirname, "..", "dev.db");

const db = new Database(DB_PATH);

db.prepare(
  `INSERT OR IGNORE INTO User (id, name) VALUES (1, 'Jennifer')`
).run();
db.prepare(`INSERT OR IGNORE INTO User (id, name) VALUES (2, 'Matus')`).run();

const users = db.prepare("SELECT * FROM User ORDER BY id").all();
console.log("Seed complete:", JSON.stringify(users));
db.close();
