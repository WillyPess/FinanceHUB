// Idempotent schema setup. Safe to run repeatedly against either the local
// file fallback or Turso. Run with: npm run migrate
const db = require("./db");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
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
    creditor    TEXT NOT NULL,
    total       REAL NOT NULL,
    paid        REAL DEFAULT 0,
    due_date    TEXT,
    note        TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id           TEXT PRIMARY KEY,
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

  CREATE TABLE IF NOT EXISTS investments_assets (
    id              TEXT PRIMARY KEY,
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
    id             TEXT PRIMARY KEY,
    asset_id       TEXT NOT NULL REFERENCES investments_assets(id) ON DELETE CASCADE,
    purchase_date  TEXT,
    invested_amount REAL NOT NULL DEFAULT 0,
    purchase_price REAL NOT NULL,
    quantity       REAL NOT NULL,
    note           TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS users (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    email              TEXT UNIQUE NOT NULL,
    hashed_password    TEXT NOT NULL,
    refresh_token_hash TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
  );
`;

async function ensureSubscriptionKind() {
  const columns = await db.all("PRAGMA table_info(subscriptions)");
  if (!columns.some((column) => column.name === "kind")) {
    await db.exec(
      "ALTER TABLE subscriptions ADD COLUMN kind TEXT CHECK(kind IN ('subscription','bill')) DEFAULT 'subscription'"
    );
    await db.exec("UPDATE subscriptions SET kind = 'subscription' WHERE kind IS NULL OR kind = ''");
  }
}

async function ensureInvestmentLotColumns() {
  const columns = await db.all("PRAGMA table_info(investment_lots)");
  if (!columns.some((column) => column.name === "invested_amount")) {
    await db.exec("ALTER TABLE investment_lots ADD COLUMN invested_amount REAL NOT NULL DEFAULT 0");
    await db.exec("UPDATE investment_lots SET invested_amount = purchase_price * quantity WHERE invested_amount = 0");
  }
}

async function migrate() {
  await db.exec(SCHEMA);
  await ensureSubscriptionKind();
  await ensureInvestmentLotColumns();
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log(`Migration complete against ${process.env.TURSO_DATABASE_URL || "file:local.db"}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrate };
