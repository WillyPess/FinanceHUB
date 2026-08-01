require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const db = require("./db");
const { migrate } = require("./migrate");
const { createAuth } = require("./auth");
const { createAuthRouter } = require("./authRoutes");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
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

const investmentTrendCache = new Map();
let quoteStatus = { mode: "idle", message: "Waiting for quotes", nextRetryAt: null };

async function getAppMetaValue(key) {
  const row = await db.get("SELECT value FROM app_meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

async function setAppMetaValue(key, value) {
  await db.run(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

async function isManualMarketLocked() {
  return (await getAppMetaValue(MANUAL_MARKET_LOCK_KEY)) === "1";
}

async function getManualTrendOverride(rangeKey) {
  const raw = await getAppMetaValue(`manual_trend_${rangeKey}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

async function resolveInvestmentIdentity(body, userId) {
  if (body.assetId) {
    const asset = await db.get("SELECT * FROM investments_assets WHERE id = ? AND user_id = ?", [body.assetId, userId]);
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

async function ensureInvestmentAsset(identity, userId) {
  if (identity.assetId) {
    return identity.assetId;
  }

  const existing = await db.get(
    "SELECT id FROM investments_assets WHERE symbol = ? AND provider_id = ? AND user_id = ?",
    [identity.symbol, identity.providerId, userId]
  );
  if (existing) {
    return existing.id;
  }

  const assetId = `asset-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  await db.run(
    "INSERT INTO investments_assets (id, user_id, symbol, name, market_type, provider_id, icon, vs_currency) VALUES (?, ?, ?, ?, ?, ?, ?, 'aud')",
    [assetId, userId, identity.symbol, identity.name, identity.marketType, identity.providerId, identity.icon]
  );
  return assetId;
}

async function getMarketPricesBySymbol() {
  const rows = await db.all("SELECT symbol, price, previous_price, day_change_pct, updated_at FROM market_prices");
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

async function getInvestmentsPayload(userId) {
  const assets = await db.all("SELECT * FROM investments_assets WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  const lots = await db.all("SELECT * FROM investment_lots WHERE user_id = ? ORDER BY purchase_date DESC, created_at DESC", [userId]);
  const marketPricesBySymbol = await getMarketPricesBySymbol();
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

  const marketStatusValue = (await isManualMarketLocked())
    ? { mode: "locked", message: "Manual market snapshot", nextRetryAt: null }
    : quoteStatus;

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
  summary.marketStatus = marketStatusValue;
  summary.lastUpdatedAt = items.reduce((latest, item) => {
    if (!item.lastUpdatedAt) return latest;
    if (!latest) return item.lastUpdatedAt;
    return item.lastUpdatedAt > latest ? item.lastUpdatedAt : latest;
  }, null);

  return { items, summary };
}

async function getInvestmentAssetPayload(assetId, userId) {
  const payload = await getInvestmentsPayload(userId);
  return payload.items.find((item) => item.id === assetId) || null;
}

async function triggerQuoteRefresh() {
  if (await isManualMarketLocked()) {
    quoteStatus = { mode: "locked", message: "Manual market snapshot", nextRetryAt: null };
    return;
  }

  if (quoteRefreshInFlight) {
    return;
  }

  if (Date.now() < nextQuoteRefreshAt) {
    return;
  }

  const assets = await db.all("SELECT id, symbol, provider_id, market_type FROM investments_assets");
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

  const statements = [];
  assets.forEach((asset) => {
    const quote = data[asset.provider_id];
    if (!quote || quote[MARKET_VS_CURRENCY] == null) return;
    const price = Number(quote[MARKET_VS_CURRENCY]);
    const dayChangePct = quote[`${MARKET_VS_CURRENCY}_24h_change`] == null ? null : Number(quote[`${MARKET_VS_CURRENCY}_24h_change`]);
    const previousPrice = Number.isFinite(dayChangePct) && dayChangePct !== -100
      ? price / (1 + (dayChangePct / 100))
      : null;

    statements.push({
      sql: "UPDATE investments_assets SET last_price = ?, day_change_pct = ?, last_updated_at = datetime('now') WHERE id = ?",
      args: [price, dayChangePct, asset.id],
    });
    statements.push({
      sql: `INSERT INTO market_prices (symbol, price, previous_price, day_change_pct, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(symbol) DO UPDATE SET
              price = excluded.price,
              previous_price = excluded.previous_price,
              day_change_pct = excluded.day_change_pct,
              updated_at = excluded.updated_at`,
      args: [asset.symbol, price, previousPrice, dayChangePct],
    });
  });

  if (statements.length) {
    await db.transaction(statements);
  }
}

async function getInvestmentTrend(range, userId) {
  const assets = await db.all("SELECT * FROM investments_assets WHERE user_id = ? ORDER BY created_at ASC", [userId]);
  const marketPricesBySymbol = await getMarketPricesBySymbol();
  if (!assets.length) {
    return [];
  }

  const rangeConfig = resolveTrendRange(range);
  const manualTrend = await getManualTrendOverride(rangeConfig.key);
  if (manualTrend?.length) {
    return manualTrend;
  }

  const lots = await db.all("SELECT asset_id, purchase_date, quantity FROM investment_lots WHERE user_id = ? ORDER BY purchase_date ASC, created_at ASC", [userId]);
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
    const fallbackSeries = getCachedOrSyntheticTrend(assets, lotsByAsset, rangeConfig, marketPricesBySymbol, userId);
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

  investmentTrendCache.set(`${userId}:${rangeConfig.key}`, { createdAt: Date.now(), data: trend });
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

function getCachedOrSyntheticTrend(assets, lotsByAsset, rangeConfig, marketPricesBySymbol = {}, userId) {
  const cached = investmentTrendCache.get(`${userId}:${rangeConfig.key}`);
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
    investmentTrendCache.set(`${userId}:${rangeConfig.key}`, { createdAt: Date.now(), data: synthetic });
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

let quoteRefreshInFlight = false;
let nextQuoteRefreshAt = 0;

async function start() {
  await migrate();

  const auth = createAuth();

  app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      port: PORT,
      dbTarget: process.env.TURSO_DATABASE_URL ? "turso" : "file:local.db",
      clientOrigin: FRONTEND_ORIGIN,
      investmentRefreshMs: INVESTMENT_REFRESH_MS,
      priceCacheRefreshMs: INVESTMENT_REFRESH_MS,
    });
  });

  app.use("/auth", createAuthRouter(auth, { isProduction: IS_PRODUCTION }));

  // Everything under /api requires a valid access token.
  app.use("/api", auth.requireAuth);

  app.get("/api/transactions", async (req, res) => {
    const rows = await db.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC", [req.user.id]);
    res.json(rows.map((row) => ({ ...row, desc: row.description })));
  });

  app.post("/api/transactions", async (req, res) => {
    const { id, icon, desc, category, date, amount, type } = req.body;
    const nextId = id || Date.now().toString();
    await db.run(
      "INSERT INTO transactions (id, user_id, icon, description, category, date, amount, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [nextId, req.user.id, icon, desc, category, date, amount, type]
    );
    const row = await db.get("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [nextId, req.user.id]);
    res.json({ ...row, desc: row.description });
  });

  app.put("/api/transactions/:id", async (req, res) => {
    const { icon, desc, category, date, amount, type } = req.body;
    const result = await db.run(
      "UPDATE transactions SET icon = ?, description = ?, category = ?, date = ?, amount = ?, type = ? WHERE id = ? AND user_id = ?",
      [icon, desc, category, date, amount, type, req.params.id, req.user.id]
    );
    if (!result.changes) {
      return res.status(404).json({ error: "Transaction not found." });
    }
    const row = await db.get("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ ...row, desc: row.description });
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    const result = await db.run("DELETE FROM transactions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!result.changes) {
      return res.status(404).json({ error: "Transaction not found." });
    }
    res.json({ ok: true, id: req.params.id });
  });

  app.get("/api/debts", async (req, res) => {
    const rows = await db.all("SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    res.json(rows.map((row) => ({ ...row, dueDate: row.due_date })));
  });

  app.post("/api/debts", async (req, res) => {
    const { id, creditor, total, paid, dueDate, note, direction } = req.body;
    const nextId = id || Date.now().toString();
    await db.run(
      "INSERT INTO debts (id, user_id, creditor, total, paid, due_date, note, direction) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [nextId, req.user.id, creditor, total, paid, dueDate, note, direction || "i-owe"]
    );
    const row = await db.get("SELECT * FROM debts WHERE id = ? AND user_id = ?", [nextId, req.user.id]);
    res.json({ ...row, dueDate: row.due_date });
  });

  app.put("/api/debts/:id", async (req, res) => {
    const { creditor, total, paid, dueDate, note, direction } = req.body;
    const result = await db.run(
      "UPDATE debts SET creditor = ?, total = ?, paid = ?, due_date = ?, note = ?, direction = ? WHERE id = ? AND user_id = ?",
      [creditor, total, paid, dueDate, note, direction || "i-owe", req.params.id, req.user.id]
    );
    if (!result.changes) {
      return res.status(404).json({ error: "Debt not found." });
    }
    const row = await db.get("SELECT * FROM debts WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ ...row, dueDate: row.due_date });
  });

  app.delete("/api/debts/:id", async (req, res) => {
    const result = await db.run("DELETE FROM debts WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!result.changes) {
      return res.status(404).json({ error: "Debt not found." });
    }
    res.json({ ok: true, id: req.params.id });
  });

  app.get("/api/subscriptions", async (req, res) => {
    const rows = await db.all("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY status, created_at DESC", [req.user.id]);
    res.json(rows.map((row) => ({ ...row, kind: row.kind || "subscription", nextBilling: row.next_billing })));
  });

  app.post("/api/subscriptions", async (req, res) => {
    const { id, kind, icon, name, category, amount, frequency, nextBilling, status, note } = req.body;
    const nextId = id || Date.now().toString();
    await db.run(
      "INSERT INTO subscriptions (id, user_id, kind, icon, name, category, amount, frequency, next_billing, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nextId, req.user.id, kind || "subscription", icon, name, category, amount, frequency, nextBilling, status, note]
    );
    const row = await db.get("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?", [nextId, req.user.id]);
    res.json({ ...row, kind: row.kind || "subscription", nextBilling: row.next_billing });
  });

  app.put("/api/subscriptions/:id", async (req, res) => {
    const { kind, icon, name, category, amount, frequency, nextBilling, status, note } = req.body;
    const result = await db.run(
      "UPDATE subscriptions SET kind = ?, icon = ?, name = ?, category = ?, amount = ?, frequency = ?, next_billing = ?, status = ?, note = ? WHERE id = ? AND user_id = ?",
      [kind || "subscription", icon, name, category, amount, frequency, nextBilling, status, note, req.params.id, req.user.id]
    );
    if (!result.changes) {
      return res.status(404).json({ error: "Subscription not found." });
    }
    const row = await db.get("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ ...row, kind: row.kind || "subscription", nextBilling: row.next_billing });
  });

  app.delete("/api/subscriptions/:id", async (req, res) => {
    const result = await db.run("DELETE FROM subscriptions WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!result.changes) {
      return res.status(404).json({ error: "Subscription not found." });
    }
    res.json({ ok: true, id: req.params.id });
  });

  app.get("/api/investments/catalog", async (_req, res) => {
    const marketPricesBySymbol = await getMarketPricesBySymbol();
    res.json(INVESTMENT_CATALOG.map((asset) => ({
      ...asset,
      currentPrice: marketPricesBySymbol[asset.symbol]?.currentPrice ?? null,
      previousPrice: marketPricesBySymbol[asset.symbol]?.previousClosePrice ?? null,
      dayChangePct: marketPricesBySymbol[asset.symbol]?.dayChangePct ?? null,
      lastUpdatedAt: marketPricesBySymbol[asset.symbol]?.updatedAt ?? null,
    })));
  });

  app.get("/api/investments", async (req, res) => {
    res.json(await getInvestmentsPayload(req.user.id));
  });

  app.get("/api/investments/trend", async (req, res) => {
    const range = String(req.query.range || req.query.timeframe || req.query.days || "1M").toUpperCase();
    try {
      const trend = await getInvestmentTrend(range, req.user.id);
      res.json(trend);
    } catch (error) {
      console.error("Investment trend failed:", error.message);
      res.json([]);
    }
  });

  app.post("/api/investments/lots", async (req, res) => {
    const body = req.body || {};
    const lotId = body.id || `lot-${Date.now()}`;
    const identity = await resolveInvestmentIdentity(body, req.user.id);
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

    const assetId = await ensureInvestmentAsset(identity, req.user.id);
    await db.run(
      "INSERT INTO investment_lots (id, user_id, asset_id, purchase_date, invested_amount, purchase_price, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [lotId, req.user.id, assetId, purchaseDate, investedAmount, purchasePrice, quantity, note]
    );

    triggerQuoteRefresh();
    const asset = await getInvestmentAssetPayload(assetId, req.user.id);
    res.json(asset);
  });

  app.delete("/api/investments/lots/:id", async (req, res) => {
    const lot = await db.get("SELECT asset_id FROM investment_lots WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!lot) {
      return res.status(404).json({ error: "Investment lot not found." });
    }

    await db.run("DELETE FROM investment_lots WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    const remaining = (await db.get(
      "SELECT COUNT(*) AS count FROM investment_lots WHERE asset_id = ? AND user_id = ?",
      [lot.asset_id, req.user.id]
    )).count;
    if (remaining === 0) {
      await db.run("DELETE FROM investments_assets WHERE id = ? AND user_id = ?", [lot.asset_id, req.user.id]);
    }

    res.json({ ok: true, id: req.params.id });
  });

  app.listen(PORT, () => {
    console.log(`FinanceHub API running at http://localhost:${PORT}`);
    console.log(`Database: ${process.env.TURSO_DATABASE_URL ? "Turso" : "file:local.db"}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });

  triggerQuoteRefresh();
  setInterval(() => {
    triggerQuoteRefresh();
  }, INVESTMENT_REFRESH_MS);
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
