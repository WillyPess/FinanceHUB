const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "financehub.db");
const INVESTMENT_REFRESH_MS = 45_000;
const TREND_CACHE_TTL_MS = 5 * 60 * 1000;
const QUOTE_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
const MARKET_VS_CURRENCY = "aud";
const MANUAL_MARKET_LOCK_KEY = "manual_market_lock";

const INVESTMENT_CATALOG = [
  { symbol: "BTC", name: "Bitcoin", marketType: "crypto", providerId: "bitcoin", icon: "btc" },
  { symbol: "ETH", name: "Ether", marketType: "crypto", providerId: "ethereum", icon: "eth" },
  { symbol: "BNB", name: "Binance Coin", marketType: "crypto", providerId: "binancecoin", icon: "bnb" },
  { symbol: "SOL", name: "Solana", marketType: "crypto", providerId: "solana", icon: "sol" },
  { symbol: "ADA", name: "Cardano", marketType: "crypto", providerId: "cardano", icon: "ada" },
  { symbol: "XRP", name: "XRP", marketType: "crypto", providerId: "ripple", icon: "xrp" },
  { symbol: "DOGE", name: "Dogecoin", marketType: "crypto", providerId: "dogecoin", icon: "doge" },
  { symbol: "AVAX", name: "Avalanche", marketType: "crypto", providerId: "avalanche-2", icon: "avax" },
  { symbol: "LINK", name: "Chainlink", marketType: "crypto", providerId: "chainlink", icon: "link" },
];

const appMetaInsert = "INSERT INTO app_meta (key, value) VALUES (?, ?)";
const db = new Database(DB_PATH);
const investmentTrendCache = new Map();
let quoteStatus = { mode: "idle", message: "Waiting for quotes", nextRetryAt: null };

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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
`);

ensureSubscriptionKind();
ensureInvestmentLotColumns();
ensureSeeded();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    port: PORT,
    dbPath: DB_PATH,
    clientOrigin: CLIENT_ORIGIN,
    investmentRefreshMs: INVESTMENT_REFRESH_MS,
    priceCacheRefreshMs: INVESTMENT_REFRESH_MS,
  });
});

app.get("/api/transactions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM transactions ORDER BY date DESC, created_at DESC").all();
  res.json(rows.map((row) => ({ ...row, desc: row.description })));
});

app.post("/api/transactions", (req, res) => {
  const { id, icon, desc, category, date, amount, type } = req.body;
  const nextId = id || Date.now().toString();
  db.prepare(
    "INSERT INTO transactions (id, icon, description, category, date, amount, type) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(nextId, icon, desc, category, date, amount, type);
  const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(nextId);
  res.json({ ...row, desc: row.description });
});

app.put("/api/transactions/:id", (req, res) => {
  const { icon, desc, category, date, amount, type } = req.body;
  db.prepare(
    "UPDATE transactions SET icon = ?, description = ?, category = ?, date = ?, amount = ?, type = ? WHERE id = ?"
  ).run(icon, desc, category, date, amount, type, req.params.id);
  const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
  res.json({ ...row, desc: row.description });
});

app.delete("/api/transactions/:id", (req, res) => {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

app.get("/api/debts", (_req, res) => {
  const rows = db.prepare("SELECT * FROM debts ORDER BY created_at DESC").all();
  res.json(rows.map((row) => ({ ...row, dueDate: row.due_date })));
});

app.post("/api/debts", (req, res) => {
  const { id, creditor, total, paid, dueDate, note } = req.body;
  const nextId = id || Date.now().toString();
  db.prepare(
    "INSERT INTO debts (id, creditor, total, paid, due_date, note) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(nextId, creditor, total, paid, dueDate, note);
  const row = db.prepare("SELECT * FROM debts WHERE id = ?").get(nextId);
  res.json({ ...row, dueDate: row.due_date });
});

app.put("/api/debts/:id", (req, res) => {
  const { creditor, total, paid, dueDate, note } = req.body;
  db.prepare(
    "UPDATE debts SET creditor = ?, total = ?, paid = ?, due_date = ?, note = ? WHERE id = ?"
  ).run(creditor, total, paid, dueDate, note, req.params.id);
  const row = db.prepare("SELECT * FROM debts WHERE id = ?").get(req.params.id);
  res.json({ ...row, dueDate: row.due_date });
});

app.delete("/api/debts/:id", (req, res) => {
  db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

app.get("/api/subscriptions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM subscriptions ORDER BY status, created_at DESC").all();
  res.json(rows.map((row) => ({ ...row, kind: row.kind || "subscription", nextBilling: row.next_billing })));
});

app.post("/api/subscriptions", (req, res) => {
  const { id, kind, icon, name, category, amount, frequency, nextBilling, status, note } = req.body;
  const nextId = id || Date.now().toString();
  db.prepare(
    "INSERT INTO subscriptions (id, kind, icon, name, category, amount, frequency, next_billing, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(nextId, kind || "subscription", icon, name, category, amount, frequency, nextBilling, status, note);
  const row = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(nextId);
  res.json({ ...row, kind: row.kind || "subscription", nextBilling: row.next_billing });
});

app.put("/api/subscriptions/:id", (req, res) => {
  const { kind, icon, name, category, amount, frequency, nextBilling, status, note } = req.body;
  db.prepare(
    "UPDATE subscriptions SET kind = ?, icon = ?, name = ?, category = ?, amount = ?, frequency = ?, next_billing = ?, status = ?, note = ? WHERE id = ?"
  ).run(kind || "subscription", icon, name, category, amount, frequency, nextBilling, status, note, req.params.id);
  const row = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(req.params.id);
  res.json({ ...row, kind: row.kind || "subscription", nextBilling: row.next_billing });
});

app.delete("/api/subscriptions/:id", (req, res) => {
  db.prepare("DELETE FROM subscriptions WHERE id = ?").run(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

app.get("/api/investments/catalog", (_req, res) => {
  const marketPricesBySymbol = getMarketPricesBySymbol();
  res.json(INVESTMENT_CATALOG.map((asset) => ({
    ...asset,
    currentPrice: marketPricesBySymbol[asset.symbol]?.currentPrice ?? null,
    previousPrice: marketPricesBySymbol[asset.symbol]?.previousClosePrice ?? null,
    dayChangePct: marketPricesBySymbol[asset.symbol]?.dayChangePct ?? null,
    lastUpdatedAt: marketPricesBySymbol[asset.symbol]?.updatedAt ?? null,
  })));
});

app.get("/api/investments", (_req, res) => {
  res.json(getInvestmentsPayload());
});

app.get("/api/investments/trend", async (req, res) => {
  const range = String(req.query.range || req.query.timeframe || req.query.days || "1M").toUpperCase();
  try {
    const trend = await getInvestmentTrend(range);
    res.json(trend);
  } catch (error) {
    console.error("Investment trend failed:", error.message);
    res.json([]);
  }
});

app.post("/api/investments/lots", (req, res) => {
  const body = req.body || {};
  const lotId = body.id || `lot-${Date.now()}`;
  const identity = resolveInvestmentIdentity(body);
  const purchaseDate = body.purchaseDate || body.purchase_date || new Date().toISOString().slice(0, 10);
  const investedAmount = Number(body.investedAmount ?? body.invested_amount);
  const quantity = Number(body.quantity);
  const purchasePriceRaw = Number(body.purchasePrice ?? body.purchase_price);
  const note = body.note || "";

  if (!identity) {
    return res.status(400).json({ error: "Unsupported asset. Pick one from the catalog or provide a valid providerId." });
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Invalid quantity." });
  }

  if (!Number.isFinite(investedAmount) || investedAmount <= 0) {
    return res.status(400).json({ error: "Invalid invested amount." });
  }

  const purchasePrice = Number.isFinite(purchasePriceRaw) && purchasePriceRaw > 0
    ? purchasePriceRaw
    : investedAmount / quantity;

  const assetId = ensureInvestmentAsset(identity);
  db.prepare(
    "INSERT INTO investment_lots (id, asset_id, purchase_date, invested_amount, purchase_price, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(lotId, assetId, purchaseDate, investedAmount, purchasePrice, quantity, note);

  triggerQuoteRefresh();
  const asset = getInvestmentAssetPayload(assetId);
  res.json(asset);
});

app.delete("/api/investments/lots/:id", (req, res) => {
  const lot = db.prepare("SELECT asset_id FROM investment_lots WHERE id = ?").get(req.params.id);
  if (!lot) {
    return res.status(404).json({ error: "Investment lot not found." });
  }

  db.prepare("DELETE FROM investment_lots WHERE id = ?").run(req.params.id);
  const remaining = db.prepare("SELECT COUNT(*) AS count FROM investment_lots WHERE asset_id = ?").get(lot.asset_id).count;
  if (remaining === 0) {
    db.prepare("DELETE FROM investments_assets WHERE id = ?").run(lot.asset_id);
  }

  res.json({ ok: true, id: req.params.id });
});

app.listen(PORT, () => {
  console.log(`FinanceHub API running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

let quoteRefreshInFlight = false;
let nextQuoteRefreshAt = 0;
triggerQuoteRefresh();
setInterval(() => {
  triggerQuoteRefresh();
}, INVESTMENT_REFRESH_MS);

function ensureSubscriptionKind() {
  const subscriptionColumns = db.prepare("PRAGMA table_info(subscriptions)").all();
  if (!subscriptionColumns.some((column) => column.name === "kind")) {
    db.exec(
      "ALTER TABLE subscriptions ADD COLUMN kind TEXT CHECK(kind IN ('subscription','bill')) DEFAULT 'subscription'"
    );
    db.exec("UPDATE subscriptions SET kind = 'subscription' WHERE kind IS NULL OR kind = ''");
  }
}

function ensureInvestmentLotColumns() {
  const lotColumns = db.prepare("PRAGMA table_info(investment_lots)").all();
  if (!lotColumns.some((column) => column.name === "invested_amount")) {
    db.exec("ALTER TABLE investment_lots ADD COLUMN invested_amount REAL NOT NULL DEFAULT 0");
    db.exec("UPDATE investment_lots SET invested_amount = purchase_price * quantity WHERE invested_amount = 0");
  }
}


function seedTransactions() {
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
    ["15", "salary", "Monthly salary", "Salary", "2025-12-01", 1300, "income"],
  ].forEach((row) => insert.run(...row));
}

function seedSubscriptions() {
  const insert = db.prepare(
    "INSERT INTO subscriptions (id, kind, icon, name, category, amount, frequency, next_billing, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  [
    ["s1", "subscription", "tv", "Netflix", "Streaming", 15.99, "monthly", "2026-03-20", "active", "Family plan"],
    ["s2", "subscription", "music", "Spotify", "Streaming", 9.99, "monthly", "2026-03-18", "active", ""],
    ["s3", "bill", "internet", "Internet", "Internet", 89.9, "monthly", "2026-03-15", "active", "300mb fiber"],
    ["s4", "bill", "home", "Rent", "Housing", 1200, "monthly", "2026-04-01", "active", "Due every 1st"],
    ["s5", "subscription", "design", "Adobe CC", "Software", 54.99, "monthly", "2026-03-25", "paused", "Temporarily paused"],
    ["s6", "bill", "phone", "Mobile plan", "Phone", 49.9, "monthly", "2026-03-22", "active", "Post-paid plan"],
    ["s7", "bill", "power", "Electricity", "Energy", 110, "monthly", "2026-03-19", "active", "Average monthly bill"],
  ].forEach((row) => insert.run(...row));
}

function seedDebts() {
  const insert = db.prepare(
    "INSERT INTO debts (id, creditor, total, paid, due_date, note) VALUES (?, ?, ?, ?, ?, ?)"
  );

  [
    ["d1", "Bank Loan", 5000, 2250, "2026-06-30", "Monthly installments"],
    ["d2", "Credit Card", 1200, 450, "2026-04-15", "Pay minimum or full"],
    ["d3", "Friend Loan", 550, 550, "2026-03-20", "Laptop loan"],
  ].forEach((row) => insert.run(...row));
}

function ensureSeeded() {
  const seeded = db.prepare("SELECT value FROM app_meta WHERE key = ?").get("seed_version");
  if (seeded) {
    return;
  }

  const counts = {
    transactions: db.prepare("SELECT COUNT(*) AS count FROM transactions").get().count,
    debts: db.prepare("SELECT COUNT(*) AS count FROM debts").get().count,
    subscriptions: db.prepare("SELECT COUNT(*) AS count FROM subscriptions").get().count,
  };

  if (counts.transactions > 0 || counts.debts > 0 || counts.subscriptions > 0) {
    db.prepare(appMetaInsert).run("seed_version", "1");
    return;
  }

  seedTransactions();
  seedSubscriptions();
  seedDebts();
  db.prepare(appMetaInsert).run("seed_version", "1");
}

function getAppMetaValue(key) {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key);
  return row?.value ?? null;
}

function setAppMetaValue(key, value) {
  db.prepare(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

function isManualMarketLocked() {
  return getAppMetaValue(MANUAL_MARKET_LOCK_KEY) === "1";
}

function getManualTrendOverride(rangeKey) {
  const raw = getAppMetaValue(`manual_trend_${rangeKey}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function resolveInvestmentIdentity(body) {
  if (body.assetId) {
    const asset = db.prepare("SELECT * FROM investments_assets WHERE id = ?").get(body.assetId);
    if (!asset) return null;
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      marketType: asset.market_type,
      providerId: asset.provider_id,
      icon: asset.icon || asset.symbol.toLowerCase(),
    };
  }

  const symbol = String(body.symbol || "").trim().toUpperCase();
  const providerId = String(body.providerId || body.provider_id || "").trim();
  const catalogMatch = INVESTMENT_CATALOG.find((item) => item.symbol === symbol || item.providerId === providerId);
  if (catalogMatch) {
    return {
      symbol: catalogMatch.symbol,
      name: catalogMatch.name,
      marketType: catalogMatch.marketType,
      providerId: catalogMatch.providerId,
      icon: catalogMatch.icon,
    };
  }

  if (!symbol || !providerId) return null;

  return {
    symbol,
    name: String(body.name || symbol).trim(),
    marketType: "crypto",
    providerId,
    icon: symbol.toLowerCase(),
  };
}

function ensureInvestmentAsset(identity) {
  if (identity.assetId) {
    return identity.assetId;
  }

  const existing = db.prepare(
    "SELECT id FROM investments_assets WHERE symbol = ? AND provider_id = ?"
  ).get(identity.symbol, identity.providerId);
  if (existing) {
    return existing.id;
  }

  const assetId = `asset-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  db.prepare(
    "INSERT INTO investments_assets (id, symbol, name, market_type, provider_id, icon, vs_currency) VALUES (?, ?, ?, ?, ?, ?, 'aud')"
  ).run(assetId, identity.symbol, identity.name, identity.marketType, identity.providerId, identity.icon);
  return assetId;
}

function getMarketPricesBySymbol() {
  const rows = db.prepare("SELECT symbol, price, previous_price, day_change_pct, updated_at FROM market_prices").all();
  return rows.reduce((acc, row) => {
    acc[row.symbol] = {
      currentPrice: row.price == null ? null : Number(row.price),
      previousClosePrice: row.previous_price == null ? null : Number(row.previous_price),
      dayChangePct: row.day_change_pct == null ? null : Number(row.day_change_pct),
      updatedAt: row.updated_at || null,
    };
    return acc;
  }, {});
}

function getInvestmentsPayload() {
  const assets = db.prepare("SELECT * FROM investments_assets ORDER BY created_at DESC").all();
  const lots = db.prepare("SELECT * FROM investment_lots ORDER BY purchase_date DESC, created_at DESC").all();
  const marketPricesBySymbol = getMarketPricesBySymbol();
  const lotsByAsset = lots.reduce((acc, lot) => {
    if (!acc[lot.asset_id]) acc[lot.asset_id] = [];
    acc[lot.asset_id].push({
      id: lot.id,
      assetId: lot.asset_id,
      purchaseDate: lot.purchase_date,
      investedAmount: lot.invested_amount,
      purchasePrice: Number(lot.purchase_price) || 0,
      quantity: Number(lot.quantity) || 0,
      note: lot.note || "",
      createdAt: lot.created_at,
    });
    return acc;
  }, {});

  const items = assets.map((asset) => {
    const assetLots = lotsByAsset[asset.id] || [];
    const marketPrice = marketPricesBySymbol[asset.symbol] || null;
    const totalQuantity = assetLots.reduce((sum, lot) => sum + lot.quantity, 0);
    const costBasis = assetLots.reduce((sum, lot) => sum + (lot.purchasePrice * lot.quantity), 0);
    const currentPrice = marketPrice?.currentPrice ?? null;
    const previousClosePrice = marketPrice?.previousClosePrice ?? null;
    const dayGain = currentPrice != null && previousClosePrice != null
      ? currentPrice - previousClosePrice
      : null;
    const dayGainPct = marketPrice?.dayChangePct ?? (
      previousClosePrice > 0 && currentPrice != null
        ? ((currentPrice - previousClosePrice) / previousClosePrice) * 100
        : null
    );
    const value = currentPrice == null ? null : currentPrice * totalQuantity;
    const totalGain = currentPrice == null ? null : costBasis === 0 ? 0 : value - costBasis;
    const totalGainPct = costBasis > 0 && totalGain != null
      ? (totalGain / costBasis) * 100
      : null;
    const dayMove = dayGain == null ? null : dayGain * totalQuantity;
    // Google Finance shows per-unit day gain on the asset row, while transaction rows use quantity-scaled total gain.
    const transactions = assetLots.map((lot) => {
      const rowValue = currentPrice == null ? null : currentPrice * lot.quantity;
      const rowTotalGain = currentPrice == null ? null : (currentPrice - lot.purchasePrice) * lot.quantity;
      const rowTotalGainPct = lot.purchasePrice > 0 && currentPrice != null
        ? ((currentPrice - lot.purchasePrice) / lot.purchasePrice) * 100
        : null;

      return {
        id: lot.id,
        assetId: lot.assetId,
        purchaseDate: lot.purchaseDate,
        purchasePrice: lot.purchasePrice,
        quantity: lot.quantity,
        currentPrice,
        value: rowValue,
        totalGain: rowTotalGain,
        totalGainPct: rowTotalGainPct,
        investedAmount: lot.investedAmount,
        note: lot.note,
        createdAt: lot.createdAt,
      };
    });

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      marketType: asset.market_type,
      providerId: asset.provider_id,
      icon: asset.icon || asset.symbol.toLowerCase(),
      quantity: totalQuantity,
      totalQuantity,
      costBasis,
      currentPrice,
      previousClosePrice,
      price: currentPrice,
      dayGain,
      dayGainPct,
      dayMove,
      value,
      currentValue: value,
      totalGain,
      totalGainPct,
      lastUpdatedAt: marketPrice?.updatedAt || asset.last_updated_at || assetLots[0]?.purchaseDate || null,
      transactions,
      lots: transactions,
    };
  }).sort((a, b) => (b.currentValue || b.costBasis || 0) - (a.currentValue || a.costBasis || 0));

  const summary = items.reduce((acc, item) => {
    acc.portfolioCost += item.costBasis || 0;
    acc.portfolioValue += item.currentValue || 0;
    acc.dayMove += item.dayMove || 0;
    return acc;
  }, { portfolioCost: 0, portfolioValue: 0, dayMove: 0 });

  summary.portfolioPl = summary.portfolioValue - summary.portfolioCost;
  summary.portfolioPlPct = summary.portfolioCost > 0 ? (summary.portfolioPl / summary.portfolioCost) * 100 : null;
  summary.costBasis = summary.portfolioCost;
  summary.currentValue = summary.portfolioValue;
  summary.totalGain = summary.portfolioPl;
  summary.totalGainPct = summary.portfolioPlPct;
  summary.dayGainValue = summary.dayMove;
  summary.assetCount = items.length;
  summary.marketStatus = isManualMarketLocked()
    ? { mode: "locked", message: "Manual market snapshot", nextRetryAt: null }
    : quoteStatus;
  summary.lastUpdatedAt = items.reduce((latest, item) => {
    if (!item.lastUpdatedAt) return latest;
    if (!latest) return item.lastUpdatedAt;
    return item.lastUpdatedAt > latest ? item.lastUpdatedAt : latest;
  }, null);

  return { items, summary };
}

function getInvestmentAssetPayload(assetId) {
  const payload = getInvestmentsPayload();
  return payload.items.find((item) => item.id === assetId) || null;
}

async function triggerQuoteRefresh() {
  if (isManualMarketLocked()) {
    quoteStatus = { mode: "locked", message: "Manual market snapshot", nextRetryAt: null };
    return;
  }

  if (quoteRefreshInFlight) {
    return;
  }

  if (Date.now() < nextQuoteRefreshAt) {
    return;
  }

  const assets = db.prepare("SELECT id, symbol, provider_id, market_type FROM investments_assets").all();
  if (!assets.length) {
    return;
  }

  quoteRefreshInFlight = true;
  try {
    const cryptoAssets = assets.filter((asset) => asset.market_type === "crypto");
    if (cryptoAssets.length) {
      await refreshCryptoQuotes(cryptoAssets);
      nextQuoteRefreshAt = 0;
      quoteStatus = { mode: "live", message: "Live quotes", nextRetryAt: null };
    }
  } catch (error) {
    if (error?.status === 429) {
      nextQuoteRefreshAt = Date.now() + QUOTE_RATE_LIMIT_COOLDOWN_MS;
      quoteStatus = {
        mode: "rate_limited",
        message: "Rate limited, using cached values",
        nextRetryAt: new Date(nextQuoteRefreshAt).toISOString(),
      };
    } else {
      quoteStatus = { mode: "fallback", message: "Quote source unavailable, using fallback values", nextRetryAt: null };
    }
    console.error("Quote refresh failed:", error.message);
  } finally {
    quoteRefreshInFlight = false;
  }
}

async function refreshCryptoQuotes(assets) {
  const ids = [...new Set(assets.map((asset) => asset.provider_id).filter(Boolean))];
  if (!ids.length) return;

  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", MARKET_VS_CURRENCY);
  url.searchParams.set("include_24hr_change", "true");

  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const error = new Error(`Quote request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  const updateAsset = db.prepare(
    "UPDATE investments_assets SET last_price = ?, day_change_pct = ?, last_updated_at = datetime('now') WHERE id = ?"
  );
  const upsertMarketPrice = db.prepare(
    `INSERT INTO market_prices (symbol, price, previous_price, day_change_pct, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(symbol) DO UPDATE SET
       price = excluded.price,
       previous_price = excluded.previous_price,
       day_change_pct = excluded.day_change_pct,
       updated_at = excluded.updated_at`
  );

  const write = db.transaction((rows) => {
    rows.forEach((asset) => {
      const quote = data[asset.provider_id];
      if (!quote || quote[MARKET_VS_CURRENCY] == null) return;
      const price = Number(quote[MARKET_VS_CURRENCY]);
      const dayChangePct = quote[`${MARKET_VS_CURRENCY}_24h_change`] == null ? null : Number(quote[`${MARKET_VS_CURRENCY}_24h_change`]);
      const previousPrice = Number.isFinite(dayChangePct) && dayChangePct !== -100
        ? price / (1 + (dayChangePct / 100))
        : null;
      updateAsset.run(price, dayChangePct, asset.id);
      upsertMarketPrice.run(asset.symbol, price, previousPrice, dayChangePct);
    });
  });

  write(assets);
}

async function getInvestmentTrend(range) {
  const assets = db.prepare("SELECT * FROM investments_assets ORDER BY created_at ASC").all();
  const marketPricesBySymbol = getMarketPricesBySymbol();
  if (!assets.length) {
    return [];
  }

  const rangeConfig = resolveTrendRange(range);
  const manualTrend = getManualTrendOverride(rangeConfig.key);
  if (manualTrend?.length) {
    return manualTrend;
  }

  const lots = db.prepare("SELECT asset_id, purchase_date, quantity FROM investment_lots ORDER BY purchase_date ASC, created_at ASC").all();
  const lotsByAsset = lots.reduce((acc, lot) => {
    if (!acc[lot.asset_id]) acc[lot.asset_id] = [];
    acc[lot.asset_id].push({
      purchaseTimestamp: new Date(`${lot.purchase_date || new Date().toISOString().slice(0, 10)}T00:00:00`).getTime(),
      quantity: Number(lot.quantity) || 0,
    });
    return acc;
  }, {});

  const historicalByProvider = await fetchHistoricalPortfolioPrices(assets, rangeConfig);
  const timeline = buildTrendTimeline(historicalByProvider, rangeConfig);
  if (!timeline.length) {
    const fallbackSeries = getCachedOrSyntheticTrend(assets, lotsByAsset, rangeConfig, marketPricesBySymbol);
    if (fallbackSeries.length) {
      return fallbackSeries;
    }
    return [];
  }

  const trend = timeline.map((timestamp, index) => {
    const value = assets.reduce((total, asset) => {
      const assetHistory = historicalByProvider[asset.provider_id] || [];
      const livePrice = marketPricesBySymbol[asset.symbol]?.currentPrice;
      const price = getPriceAtTimestamp(assetHistory, timestamp) ?? livePrice ?? (Number(asset.last_price) || 0);
      const activeQuantity = (lotsByAsset[asset.id] || []).reduce((sum, lot) => (
        lot.purchaseTimestamp <= timestamp ? sum + lot.quantity : sum
      ), 0);
      return total + (activeQuantity * price);
    }, 0);

    return {
      timestamp,
      date: new Date(timestamp).toISOString(),
      label: formatTrendLabel(timestamp, rangeConfig, index, timeline.length),
      value: Number(value.toFixed(2)),
    };
  });

  investmentTrendCache.set(rangeConfig.key, { createdAt: Date.now(), data: trend });
  return trend;
}

function resolveTrendRange(range) {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const ytdDays = Math.max(1, Math.ceil((today - startOfYear) / 86400000) + 1);
  const key = String(range || "1M").toUpperCase();
  const map = {
    "1D": { key: "1D", days: "1" },
    "5D": { key: "5D", days: "5" },
    "1M": { key: "1M", days: "30", interval: "daily" },
    "6M": { key: "6M", days: "180", interval: "daily" },
    YTD: { key: "YTD", days: String(ytdDays), interval: "daily" },
    "1Y": { key: "1Y", days: "365", interval: "daily" },
    "5Y": { key: "5Y", days: "1825", interval: "daily" },
    MAX: { key: "MAX", days: "max", interval: "daily" },
  };
  return map[key] || map["1M"];
}

async function fetchHistoricalPortfolioPrices(assets, rangeConfig) {
  const cryptoAssets = assets.filter((asset) => asset.market_type === "crypto" && asset.provider_id);
  if (!cryptoAssets.length) {
    return {};
  }

  const results = await Promise.all(
    cryptoAssets.map(async (asset) => {
      const url = new URL(`https://api.coingecko.com/api/v3/coins/${asset.provider_id}/market_chart`);
      url.searchParams.set("vs_currency", MARKET_VS_CURRENCY);
      url.searchParams.set("days", String(rangeConfig.days));
      if (rangeConfig.interval) {
        url.searchParams.set("interval", rangeConfig.interval);
      }

      try {
        const response = await fetch(url, {
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Trend request failed with status ${response.status}`);
        }

        const data = await response.json();
        const prices = Array.isArray(data.prices) ? data.prices : [];
        const normalized = prices
          .filter((entry) => Array.isArray(entry) && entry.length >= 2)
          .map(([timestamp, price]) => [Number(timestamp), Number(price)])
          .filter(([timestamp, price]) => Number.isFinite(timestamp) && Number.isFinite(price));

        return [asset.provider_id, normalized];
      } catch (error) {
        console.error(`Trend fetch failed for ${asset.provider_id}:`, error.message);
        return [asset.provider_id, []];
      }
    })
  );

  return Object.fromEntries(results);
}

function buildTrendTimeline(historicalByProvider, rangeConfig) {
  const allPoints = Object.values(historicalByProvider).flat();
  if (!allPoints.length) {
    return [];
  }

  const unique = [...new Set(allPoints.map(([timestamp]) => Number(timestamp)).filter(Number.isFinite))].sort((a, b) => a - b);
  if (rangeConfig.key === "1D" || rangeConfig.key === "5D") {
    return unique;
  }

  const dailyBuckets = new Map();
  unique.forEach((timestamp) => {
    const dateKey = new Date(timestamp).toISOString().slice(0, 10);
    dailyBuckets.set(dateKey, timestamp);
  });
  return [...dailyBuckets.values()].sort((a, b) => a - b);
}

function getPriceAtTimestamp(priceSeries, timestamp) {
  if (!priceSeries.length) {
    return null;
  }

  let lastPrice = null;
  for (const [pointTime, pointPrice] of priceSeries) {
    if (pointTime > timestamp) {
      break;
    }
    lastPrice = pointPrice;
  }
  return lastPrice;
}

function formatTrendLabel(timestamp, rangeConfig, index, length) {
  const date = new Date(timestamp);
  if (rangeConfig.key === "1D") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (rangeConfig.key === "5D") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const showMonth = index === 0 || index === length - 1 || date.getDate() === 1;
  const day = date.toLocaleDateString("en-US", { day: "numeric" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return showMonth ? `${day} ${month}` : day;
}

function getCachedOrSyntheticTrend(assets, lotsByAsset, rangeConfig, marketPricesBySymbol = {}) {
  const cached = investmentTrendCache.get(rangeConfig.key);
  if (cached && Date.now() - cached.createdAt <= TREND_CACHE_TTL_MS && Array.isArray(cached.data) && cached.data.length) {
    return cached.data;
  }

  const syntheticTimeline = buildSyntheticTimeline(rangeConfig);
  const synthetic = syntheticTimeline.map((timestamp, index) => {
    const value = assets.reduce((total, asset) => {
      const price = marketPricesBySymbol[asset.symbol]?.currentPrice ?? (Number(asset.last_price) || 0);
      const activeQuantity = (lotsByAsset[asset.id] || []).reduce((sum, lot) => (
        lot.purchaseTimestamp <= timestamp ? sum + lot.quantity : sum
      ), 0);
      return total + (activeQuantity * price);
    }, 0);

    return {
      timestamp,
      date: new Date(timestamp).toISOString(),
      label: formatTrendLabel(timestamp, rangeConfig, index, syntheticTimeline.length),
      value: Number(value.toFixed(2)),
    };
  });

  if (synthetic.length) {
    investmentTrendCache.set(rangeConfig.key, { createdAt: Date.now(), data: synthetic });
  }
  return synthetic;
}

function buildSyntheticTimeline(rangeConfig) {
  const now = new Date();
  const points = [];

  if (rangeConfig.key === "1D") {
    for (let i = 23; i >= 0; i -= 1) {
      const point = new Date(now);
      point.setMinutes(0, 0, 0);
      point.setHours(now.getHours() - i);
      points.push(point.getTime());
    }
    return points;
  }

  const totalDays = rangeConfig.days === "max" ? 365 : Number(rangeConfig.days || 30);
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const point = new Date(now);
    point.setHours(0, 0, 0, 0);
    point.setDate(now.getDate() - i);
    points.push(point.getTime());
  }
  return points;
}
