const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "financehub.db");

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL"); // better performance
  db.pragma("foreign_keys = ON");
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      icon        TEXT,
      description TEXT NOT NULL,
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('income','expense')),
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debts (
      id          TEXT PRIMARY KEY,
      creditor    TEXT NOT NULL,
      total       REAL NOT NULL,
      paid        REAL NOT NULL DEFAULT 0,
      due_date    TEXT,
      note        TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id           TEXT PRIMARY KEY,
      icon         TEXT,
      name         TEXT NOT NULL,
      category     TEXT NOT NULL,
      amount       REAL NOT NULL,
      frequency    TEXT NOT NULL CHECK(frequency IN ('weekly','monthly','yearly')),
      next_billing TEXT,
      status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','cancelled')),
      note         TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed only if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM transactions").get();
  if (count.c === 0) {
    seedData(db);
    console.log("✅ Database seeded with sample data.");
  }

  db.close();
  console.log(`✅ Database ready at: ${DB_PATH}`);
}

function seedData(db) {
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, icon, description, category, date, amount, type)
    VALUES (@id, @icon, @description, @category, @date, @amount, @type)
  `);

  const transactions = [
    { id:"1",  icon:"🎮", description:"Concert tickets",    category:"Entertainment", date:"2026-03-07", amount:200,    type:"expense" },
    { id:"2",  icon:"🚗", description:"Gas and parking",    category:"Transport",     date:"2026-03-06", amount:150,    type:"expense" },
    { id:"3",  icon:"💼", description:"Website project",    category:"Freelance",     date:"2026-03-05", amount:1500,   type:"income"  },
    { id:"4",  icon:"📺", description:"Streaming services", category:"Subscriptions", date:"2026-03-05", amount:49.99,  type:"expense" },
    { id:"5",  icon:"🍔", description:"Groceries",          category:"Food",          date:"2026-03-04", amount:320,    type:"expense" },
    { id:"6",  icon:"⚡", description:"Electric bill",      category:"Utilities",     date:"2026-03-03", amount:85,     type:"expense" },
    { id:"7",  icon:"💰", description:"Monthly salary",     category:"Salary",        date:"2026-03-01", amount:5200,   type:"income"  },
    { id:"8",  icon:"🏠", description:"Rent payment",       category:"Housing",       date:"2026-03-01", amount:1200,   type:"expense" },
    { id:"9",  icon:"💊", description:"Pharmacy",           category:"Health",        date:"2026-02-20", amount:75,     type:"expense" },
    { id:"10", icon:"💰", description:"Monthly salary",     category:"Salary",        date:"2026-02-01", amount:5200,   type:"income"  },
    { id:"11", icon:"🏠", description:"Rent payment",       category:"Housing",       date:"2026-02-01", amount:1200,   type:"expense" },
    { id:"12", icon:"🍔", description:"Groceries",          category:"Food",          date:"2026-02-10", amount:290,    type:"expense" },
    { id:"13", icon:"💰", description:"Monthly salary",     category:"Salary",        date:"2026-01-01", amount:5200,   type:"income"  },
    { id:"14", icon:"🏠", description:"Rent payment",       category:"Housing",       date:"2026-01-01", amount:1200,   type:"expense" },
    { id:"15", icon:"💰", description:"Monthly salary",     category:"Salary",        date:"2025-12-01", amount:1300,   type:"income"  },
  ];
  transactions.forEach(t => insertTx.run(t));

  const insertDebt = db.prepare(`
    INSERT INTO debts (id, creditor, total, paid, due_date, note)
    VALUES (@id, @creditor, @total, @paid, @due_date, @note)
  `);
  [
    { id:"d1", creditor:"Bank Loan",   total:5000, paid:2250, due_date:"2026-06-30", note:"Monthly installments" },
    { id:"d2", creditor:"Credit Card", total:1200, paid:450,  due_date:"2026-04-15", note:"Pay minimum or full"  },
    { id:"d3", creditor:"Friend João", total:550,  paid:550,  due_date:"2026-03-20", note:"Laptop loan"          },
  ].forEach(d => insertDebt.run(d));

  const insertSub = db.prepare(`
    INSERT INTO subscriptions (id, icon, name, category, amount, frequency, next_billing, status, note)
    VALUES (@id, @icon, @name, @category, @amount, @frequency, @next_billing, @status, @note)
  `);
  [
    { id:"s1", icon:"📺", name:"Netflix",   category:"Streaming", amount:15.99, frequency:"monthly", next_billing:"2026-03-20", status:"active",    note:"Family plan" },
    { id:"s2", icon:"🎵", name:"Spotify",   category:"Streaming", amount:9.99,  frequency:"monthly", next_billing:"2026-03-18", status:"active",    note:"" },
    { id:"s3", icon:"🌐", name:"Internet",  category:"Internet",  amount:89.90, frequency:"monthly", next_billing:"2026-03-15", status:"active",    note:"300mb fiber" },
    { id:"s4", icon:"🏠", name:"Rent",      category:"Housing",   amount:1200,  frequency:"monthly", next_billing:"2026-04-01", status:"active",    note:"Due every 1st" },
    { id:"s5", icon:"💻", name:"Adobe CC",  category:"Software",  amount:54.99, frequency:"monthly", next_billing:"2026-03-25", status:"paused",    note:"Temporarily paused" },
    { id:"s6", icon:"📱", name:"Phone",     category:"Phone",     amount:49.90, frequency:"monthly", next_billing:"2026-03-22", status:"active",    note:"Postpaid plan" },
  ].forEach(s => insertSub.run(s));
}

module.exports = { getDb, initDb };
