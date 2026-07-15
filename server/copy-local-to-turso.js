// One-off data migration: copies rows from the legacy local better-sqlite3
// file into Turso, table by table, preserving IDs. Safe to re-run — existing
// rows are left alone (INSERT OR IGNORE) so nothing gets duplicated or overwritten.
// Run with: node server/copy-local-to-turso.js [path-to-local.db]
require("dotenv").config();
const path = require("path");
const Database = require("better-sqlite3");
const { createClient } = require("@libsql/client");
const { migrate } = require("./migrate");

const LOCAL_DB_PATH = process.argv[2] || path.join(__dirname, "financehub.db");

const TABLES = [
  { name: "users", columns: ["id", "email", "hashed_password", "refresh_token_hash", "created_at"] },
  { name: "transactions", columns: ["id", "icon", "description", "category", "date", "amount", "type", "created_at"] },
  { name: "debts", columns: ["id", "creditor", "total", "paid", "due_date", "note", "created_at"] },
  { name: "subscriptions", columns: ["id", "kind", "icon", "name", "category", "amount", "frequency", "next_billing", "status", "note", "created_at"] },
  { name: "investments_assets", columns: ["id", "symbol", "name", "market_type", "provider_id", "icon", "vs_currency", "last_price", "day_change_pct", "last_updated_at", "created_at"] },
  { name: "investment_lots", columns: ["id", "asset_id", "purchase_date", "invested_amount", "purchase_price", "quantity", "note", "created_at"] },
  { name: "market_prices", columns: ["symbol", "price", "previous_price", "day_change_pct", "updated_at"] },
  { name: "app_meta", columns: ["key", "value", "created_at"] },
];

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("TURSO_DATABASE_URL is not set — nothing to copy to. Check your .env file.");
    process.exit(1);
  }

  const local = new Database(LOCAL_DB_PATH, { readonly: true });
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await migrate();

  const summary = [];

  for (const table of TABLES) {
    const localTableExists = local
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table.name);
    if (!localTableExists) {
      summary.push({ table: table.name, copied: 0, skipped: 0, note: "no local table" });
      continue;
    }

    const rows = local.prepare(`SELECT * FROM ${table.name}`).all();
    let copied = 0;
    let skipped = 0;

    const columnList = table.columns.join(", ");
    const placeholders = table.columns.map(() => "?").join(", ");
    const insertSql = `INSERT OR IGNORE INTO ${table.name} (${columnList}) VALUES (${placeholders})`;

    for (const row of rows) {
      const args = table.columns.map((column) => row[column] ?? null);
      const result = await turso.execute({ sql: insertSql, args });
      if (result.rowsAffected > 0) {
        copied += 1;
      } else {
        skipped += 1;
      }
    }

    summary.push({ table: table.name, copied, skipped, total: rows.length });
  }

  local.close();

  console.log("\nCopy summary:");
  summary.forEach(({ table, copied, skipped, total, note }) => {
    if (note) {
      console.log(`  ${table}: ${note}`);
    } else {
      console.log(`  ${table}: ${copied} copied, ${skipped} already present (of ${total} local rows)`);
    }
  });
}

main().catch((error) => {
  console.error("Copy failed:", error);
  process.exit(1);
});
