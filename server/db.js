require("dotenv").config();
const { createClient } = require("@libsql/client");

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(
  process.env.TURSO_DATABASE_URL
    ? { url, authToken }
    : { url }
);

// Runs a multi-statement DDL string (e.g. several `CREATE TABLE IF NOT EXISTS` statements
// separated by `;`) sequentially. libSQL's execute() only accepts a single statement.
async function exec(sql) {
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function run(sql, args = []) {
  const result = await client.execute({ sql, args });
  return { lastInsertRowid: result.lastInsertRowid, changes: result.rowsAffected };
}

async function get(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows[0];
}

async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

// Runs a list of { sql, args } statements atomically, mirroring better-sqlite3's
// db.transaction(fn) usage in the original code.
async function transaction(statements) {
  return client.batch(
    statements.map(({ sql, args = [] }) => ({ sql, args })),
    "write"
  );
}

module.exports = { client, exec, run, get, all, transaction };
