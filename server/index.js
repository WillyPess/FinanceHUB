const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "financehub.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
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
`);

function seedTransactions() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM transactions").get();
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare(
    "INSERT INTO transactions (id, icon, description, category, date, amount, type) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  [
    ["1", "tickets", "Concert tickets", "Entertainment", "2026-03-07", 200, "expense"],
    ["2", "car", "Gas and parking", "Transport", "2026-03-06", 150, "expense"],
    ["3", "work", "Website project", "Freelance", "2026-03-05", 1500, "income"],
    ["4", "tv", "Streaming services", "Subscriptions", "2026-03-05", 49.99, "expense"],
    ["5", "food", "Groceries", "Food", "2026-03-04", 320, "expense"],
    ["6", "power", "Electric bill", "Utilities", "2026-03-03", 85, "expense"],
    ["7", "salary", "Monthly salary", "Salary", "2026-03-01", 5200, "income"],
    ["8", "home", "Rent payment", "Housing", "2026-03-01", 1200, "expense"],
    ["9", "health", "Pharmacy", "Health", "2026-02-20", 75, "expense"],
    ["10", "salary", "Monthly salary", "Salary", "2026-02-01", 5200, "income"],
    ["11", "home", "Rent payment", "Housing", "2026-02-01", 1200, "expense"],
    ["12", "food", "Groceries", "Food", "2026-02-10", 290, "expense"],
    ["13", "salary", "Monthly salary", "Salary", "2026-01-01", 5200, "income"],
    ["14", "home", "Rent payment", "Housing", "2026-01-01", 1200, "expense"],
    ["15", "salary", "Monthly salary", "Salary", "2025-12-01", 1300, "income"]
  ].forEach((row) => insert.run(...row));
}

function seedSubscriptions() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM subscriptions").get();
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare(
    "INSERT INTO subscriptions (id, icon, name, category, amount, frequency, next_billing, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  [
    ["s1", "tv", "Netflix", "Streaming", 15.99, "monthly", "2026-03-20", "active", "Family plan"],
    ["s2", "music", "Spotify", "Streaming", 9.99, "monthly", "2026-03-18", "active", ""],
    ["s3", "internet", "Internet", "Internet", 89.9, "monthly", "2026-03-15", "active", "300mb fiber"],
    ["s4", "home", "Rent", "Housing", 1200, "monthly", "2026-04-01", "active", "Due every 1st"],
    ["s5", "design", "Adobe CC", "Software", 54.99, "monthly", "2026-03-25", "paused", "Temporarily paused"],
    ["s6", "phone", "Mobile plan", "Phone", 49.9, "monthly", "2026-03-22", "active", "Post-paid plan"]
  ].forEach((row) => insert.run(...row));
}

function seedDebts() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM debts").get();
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare(
    "INSERT INTO debts (id, creditor, total, paid, due_date, note) VALUES (?, ?, ?, ?, ?, ?)"
  );

  [
    ["d1", "Bank Loan", 5000, 2250, "2026-06-30", "Monthly installments"],
    ["d2", "Credit Card", 1200, 450, "2026-04-15", "Pay minimum or full"],
    ["d3", "Friend Loan", 550, 550, "2026-03-20", "Laptop loan"]
  ].forEach((row) => insert.run(...row));
}

seedTransactions();
seedSubscriptions();
seedDebts();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    port: PORT,
    dbPath: DB_PATH,
    clientOrigin: CLIENT_ORIGIN
  });
});

app.get("/api/transactions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM transactions ORDER BY date DESC, created_at DESC").all();
  res.json(rows.map((row) => ({ ...row, desc: row.description })));
});

app.post("/api/transactions", (req, res) => {
  const { id, icon, desc, category, date, amount, type } = req.body;
  db.prepare(
    "INSERT INTO transactions (id, icon, description, category, date, amount, type) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, icon, desc, category, date, amount, type);
  res.json({ ok: true });
});

app.put("/api/transactions/:id", (req, res) => {
  const { icon, desc, category, date, amount, type } = req.body;
  db.prepare(
    "UPDATE transactions SET icon = ?, description = ?, category = ?, date = ?, amount = ?, type = ? WHERE id = ?"
  ).run(icon, desc, category, date, amount, type, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/transactions/:id", (req, res) => {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/debts", (_req, res) => {
  res.json(db.prepare("SELECT * FROM debts ORDER BY created_at DESC").all());
});

app.post("/api/debts", (req, res) => {
  const { id, creditor, total, paid, dueDate, note } = req.body;
  db.prepare(
    "INSERT INTO debts (id, creditor, total, paid, due_date, note) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, creditor, total, paid, dueDate, note);
  res.json({ ok: true });
});

app.put("/api/debts/:id", (req, res) => {
  const { creditor, total, paid, dueDate, note } = req.body;
  db.prepare(
    "UPDATE debts SET creditor = ?, total = ?, paid = ?, due_date = ?, note = ? WHERE id = ?"
  ).run(creditor, total, paid, dueDate, note, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/debts/:id", (req, res) => {
  db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/subscriptions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM subscriptions ORDER BY status, created_at DESC").all();
  res.json(rows.map((row) => ({ ...row, nextBilling: row.next_billing })));
});

app.post("/api/subscriptions", (req, res) => {
  const { id, icon, name, category, amount, frequency, nextBilling, status, note } = req.body;
  db.prepare(
    "INSERT INTO subscriptions (id, icon, name, category, amount, frequency, next_billing, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, icon, name, category, amount, frequency, nextBilling, status, note);
  res.json({ ok: true });
});

app.put("/api/subscriptions/:id", (req, res) => {
  const { icon, name, category, amount, frequency, nextBilling, status, note } = req.body;
  db.prepare(
    "UPDATE subscriptions SET icon = ?, name = ?, category = ?, amount = ?, frequency = ?, next_billing = ?, status = ?, note = ? WHERE id = ?"
  ).run(icon, name, category, amount, frequency, nextBilling, status, note, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/subscriptions/:id", (req, res) => {
  db.prepare("DELETE FROM subscriptions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`FinanceHub API running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
