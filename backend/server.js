const express = require("express");
const cors = require("cors");
const { getDb, initDb } = require("./database");

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Init DB on startup
initDb();

// ─── HELPERS ───────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ok(res, data)   { res.json({ ok: true, data }); }
function err(res, msg, status = 400) { res.status(status).json({ ok: false, error: msg }); }

// ─── TRANSACTIONS ───────────────────────────────────────────
app.get("/api/transactions", (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM transactions ORDER BY date DESC, created_at DESC").all();
  db.close();
  ok(res, rows);
});

app.post("/api/transactions", (req, res) => {
  const { icon, description, category, date, amount, type } = req.body;
  if (!description || !category || !date || !amount || !type) return err(res, "Missing fields");
  const db = getDb();
  const id = generateId();
  db.prepare(`
    INSERT INTO transactions (id, icon, description, category, date, amount, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, icon || "📦", description, category, date, amount, type);
  const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  db.close();
  ok(res, row);
});

app.put("/api/transactions/:id", (req, res) => {
  const { icon, description, category, date, amount, type } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE transactions SET icon=?, description=?, category=?, date=?, amount=?, type=?
    WHERE id=?
  `).run(icon, description, category, date, amount, type, req.params.id);
  const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
  db.close();
  ok(res, row);
});

app.delete("/api/transactions/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
  db.close();
  ok(res, { id: req.params.id });
});

// ─── DEBTS ──────────────────────────────────────────────────
app.get("/api/debts", (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM debts ORDER BY created_at DESC").all();
  db.close();
  ok(res, rows);
});

app.post("/api/debts", (req, res) => {
  const { creditor, total, paid, due_date, note } = req.body;
  if (!creditor || total == null) return err(res, "Missing fields");
  const db = getDb();
  const id = generateId();
  db.prepare(`
    INSERT INTO debts (id, creditor, total, paid, due_date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, creditor, total, paid || 0, due_date || null, note || "");
  const row = db.prepare("SELECT * FROM debts WHERE id = ?").get(id);
  db.close();
  ok(res, row);
});

app.put("/api/debts/:id", (req, res) => {
  const { creditor, total, paid, due_date, note } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE debts SET creditor=?, total=?, paid=?, due_date=?, note=? WHERE id=?
  `).run(creditor, total, paid, due_date, note, req.params.id);
  const row = db.prepare("SELECT * FROM debts WHERE id = ?").get(req.params.id);
  db.close();
  ok(res, row);
});

app.delete("/api/debts/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id);
  db.close();
  ok(res, { id: req.params.id });
});

// ─── SUBSCRIPTIONS ──────────────────────────────────────────
app.get("/api/subscriptions", (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM subscriptions ORDER BY status ASC, created_at DESC").all();
  db.close();
  ok(res, rows);
});

app.post("/api/subscriptions", (req, res) => {
  const { icon, name, category, amount, frequency, next_billing, status, note } = req.body;
  if (!name || !category || amount == null) return err(res, "Missing fields");
  const db = getDb();
  const id = generateId();
  db.prepare(`
    INSERT INTO subscriptions (id, icon, name, category, amount, frequency, next_billing, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, icon || "📦", name, category, amount, frequency || "monthly", next_billing || null, status || "active", note || "");
  const row = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id);
  db.close();
  ok(res, row);
});

app.put("/api/subscriptions/:id", (req, res) => {
  const { icon, name, category, amount, frequency, next_billing, status, note } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE subscriptions SET icon=?, name=?, category=?, amount=?, frequency=?, next_billing=?, status=?, note=?
    WHERE id=?
  `).run(icon, name, category, amount, frequency, next_billing, status, note, req.params.id);
  const row = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(req.params.id);
  db.close();
  ok(res, row);
});

app.delete("/api/subscriptions/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM subscriptions WHERE id = ?").run(req.params.id);
  db.close();
  ok(res, { id: req.params.id });
});

// ─── HEALTH CHECK ───────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "FinanceHub API running", port: PORT });
});

app.listen(PORT, () => {
  console.log(`\n🚀 FinanceHub API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
