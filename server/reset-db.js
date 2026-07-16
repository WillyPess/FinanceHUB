// Drops every table and re-runs migrations, leaving a clean empty schema.
// Works against whatever database the env vars point at (Turso if
// TURSO_DATABASE_URL is set, otherwise the local file fallback).
// Run with: node server/reset-db.js
require("dotenv").config();
const readline = require("readline");
const db = require("./db");
const { migrate } = require("./migrate");

const TABLES = [
  "investment_lots",
  "investments_assets",
  "market_prices",
  "transactions",
  "debts",
  "subscriptions",
  "app_meta",
  "users",
];

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const target = process.env.TURSO_DATABASE_URL || "file:local.db";
  console.log(`This will DROP ALL TABLES in: ${target}`);
  const answer = await confirm("Are you sure? All data will be permanently lost. (y/N) ");

  if (answer !== "y" && answer !== "yes") {
    console.log("Aborted. Nothing was changed.");
    return;
  }

  for (const table of TABLES) {
    await db.exec(`DROP TABLE IF EXISTS ${table}`);
  }

  await migrate();
  console.log(`Database reset complete against ${target}. Schema is now empty.`);
  console.log("Run: npm run create-user");
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
