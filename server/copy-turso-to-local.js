// One-off data sync: pulls rows from Turso into the local libSQL file, table by
// table, preserving IDs. Safe to re-run — existing rows are left alone
// (INSERT OR IGNORE) so nothing gets duplicated or overwritten.
// Run with: node server/copy-turso-to-local.js [path-to-local-db-file]
require("dotenv").config();
const path = require("path");
const { createClient } = require("@libsql/client");

const LOCAL_DB_PATH = process.argv[2] || path.join(__dirname, "..", "local.db");

// Mirrors server/migrate.js's schema so a fresh local.db ends up with the same
// tables/columns as Turso, without routing through db.js (which would connect
// to Turso for both sides while TURSO_DATABASE_URL is set for this script).
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    username           TEXT UNIQUE NOT NULL,
    hashed_password    TEXT NOT NULL,
    refresh_token_hash TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS investments_assets (
    id              TEXT PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    symbol          TEXT NOT NULL,
    name            TEXT NOT NULL,
    market_type     TEXT CHECK(market_type IN ('crypto')) DEFAULT 'crypto',
    provider_id     TEXT NOT NULL,
    icon            TEXT,
    vs_currency     TEXT DEFAULT 'aud',
    last_price      REAL,
    day_change_pct  REAL,
    last_updated_at TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS investment_lots (
    id              TEXT PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    asset_id        TEXT NOT NULL REFERENCES investments_assets(id) ON DELETE CASCADE,
    purchase_date   TEXT,
    invested_amount REAL NOT NULL DEFAULT 0,
    purchase_price  REAL NOT NULL,
    quantity        REAL NOT NULL,
    note            TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    icon        TEXT,
    description TEXT NOT NULL,
    category    TEXT,
    date        TEXT,
    amount      REAL NOT NULL,
    type        TEXT CHECK(type IN ('income','expense')) NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debts (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    creditor    TEXT NOT NULL,
    total       REAL NOT NULL,
    paid        REAL DEFAULT 0,
    due_date    TEXT,
    note        TEXT,
    direction   TEXT CHECK(direction IN ('i-owe','owed')) NOT NULL DEFAULT 'i-owe',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id           TEXT PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id),
    kind         TEXT CHECK(kind IN ('subscription','bill')) DEFAULT 'subscription',
    icon         TEXT,
    name         TEXT NOT NULL,
    category     TEXT,
    amount       REAL NOT NULL,
    frequency    TEXT CHECK(frequency IN ('weekly','monthly','yearly')) DEFAULT 'monthly',
    next_billing TEXT,
    status       TEXT CHECK(status IN ('active','paused','cancelled')) DEFAULT 'active',
    note         TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS market_prices (
    symbol         TEXT PRIMARY KEY,
    price          REAL NOT NULL,
    previous_price REAL,
    day_change_pct REAL,
    updated_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key          TEXT PRIMARY KEY,
    value        TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );
`;

// Order matters: users before the FK'd tables, investments_assets before investment_lots.
const TABLES = [
  { name: "users", columns: ["id", "username", "hashed_password", "refresh_token_hash", "created_at"] },
  { name: "investments_assets", columns: ["id", "user_id", "symbol", "name", "market_type", "provider_id", "icon", "vs_currency", "last_price", "day_change_pct", "last_updated_at", "created_at"] },
  { name: "investment_lots", columns: ["id", "user_id", "asset_id", "purchase_date", "invested_amount", "purchase_price", "quantity", "note", "created_at"] },
  { name: "transactions", columns: ["id", "user_id", "icon", "description", "category", "date", "amount", "type", "created_at"] },
  { name: "debts", columns: ["id", "user_id", "creditor", "total", "paid", "due_date", "note", "direction", "created_at"] },
  { name: "subscriptions", columns: ["id", "user_id", "kind", "icon", "name", "category", "amount", "frequency", "next_billing", "status", "note", "created_at"] },
  { name: "market_prices", columns: ["symbol", "price", "previous_price", "day_change_pct", "updated_at"] },
  { name: "app_meta", columns: ["key", "value", "created_at"] },
];

async function execAll(client, sql) {
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("TURSO_DATABASE_URL is not set — nothing to copy from. Check your .env file.");
    process.exit(1);
  }

  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const local = createClient({ url: `file:${LOCAL_DB_PATH}` });

  await execAll(local, SCHEMA);

  const summary = [];

  for (const table of TABLES) {
    const { rows } = await turso.execute(`SELECT ${table.columns.join(", ")} FROM ${table.name}`);

    const columnList = table.columns.join(", ");
    const placeholders = table.columns.map(() => "?").join(", ");
    const insertSql = `INSERT OR IGNORE INTO ${table.name} (${columnList}) VALUES (${placeholders})`;

    let copied = 0;
    let skipped = 0;

    for (const row of rows) {
      const args = table.columns.map((column) => row[column] ?? null);
      const result = await local.execute({ sql: insertSql, args });
      if (result.rowsAffected > 0) {
        copied += 1;
      } else {
        skipped += 1;
      }
    }

    summary.push({ table: table.name, copied, skipped, total: rows.length });
  }

  console.log(`\nCopied from Turso into ${LOCAL_DB_PATH}:`);
  summary.forEach(({ table, copied, skipped, total }) => {
    console.log(`  ${table}: ${copied} copied, ${skipped} already present (of ${total} Turso rows)`);
  });
}

main().catch((error) => {
  console.error("Copy failed:", error);
  process.exit(1);
});
