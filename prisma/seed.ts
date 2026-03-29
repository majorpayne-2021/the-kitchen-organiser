/**
 * Seed default users (Jennifer, Matus).
 *
 * Uses better-sqlite3 directly to avoid @libsql/client WASM startup in
 * non-Next.js environments (e.g. CLI scripts).
 *
 * Run: npx prisma db seed
 */
import Database from "better-sqlite3";
import { join, dirname, isAbsolute } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const DEV_DB = "file:./data/dev/kitchen.db";

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || DEV_DB;
  const dbPath = url.replace(/^file:/, "");
  return isAbsolute(dbPath) ? dbPath : join(ROOT, dbPath);
}

const db = new Database(resolveDbPath());

db.prepare(
  `INSERT OR IGNORE INTO User (id, name) VALUES (1, 'Jennifer')`
).run();
db.prepare(`INSERT OR IGNORE INTO User (id, name) VALUES (2, 'Matus')`).run();

const users = db.prepare("SELECT * FROM User ORDER BY id").all();
console.log("Seed complete:", JSON.stringify(users));
db.close();
