import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fmt, fmtDate } from "../utils/formatters.js";
import { CAT_COLORS, CAT_ICONS, MONTHS, resolveIconGlyph } from "../constants.js";
import styles from "./Dashboard.module.css";

export default function Dashboard({ data, onEditTx, onDeleteTx }) {
  const { transactions, debts, subscriptions } = data;
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const pendingDebts = debts.reduce((sum, debt) => sum + Math.max(debt.total - debt.paid, 0), 0);
  const fixedMonthly = subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => {
      if (item.frequency === "yearly") return sum + item.amount / 12;
      if (item.frequency === "weekly") return sum + item.amount * 4.33;
      return sum + item.amount;
    }, 0);

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const current = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      return {
        name: MONTHS[current.getMonth()],
        income: transactions.filter((tx) => tx.type === "income" && tx.date?.startsWith(monthKey)).reduce((sum, tx) => sum + tx.amount, 0),
        expenses: transactions.filter((tx) => tx.type === "expense" && tx.date?.startsWith(monthKey)).reduce((sum, tx) => sum + tx.amount, 0),
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const grouped = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {});

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        pct: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
        color: CAT_COLORS[name] || "#98a2b3",
      }));
  }, [transactions, totalExpense]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Your financial overview</p>
        </div>
        <button type="button" className={styles.exportBtn}>
          <span className={styles.exportIcon}>v</span>
          Export
        </button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="TOTAL INCOME" value={fmt(totalIncome)} accent="green" icon="In" />
        <StatCard label="TOTAL EXPENSES" value={fmt(totalExpense)} accent="red" icon="Out" />
        <StatCard label="BALANCE" value={fmt(balance)} accent="blue" icon="Net" />
        <StatCard label="FIXED / MONTH" value={fmt(fixedMonthly)} accent="gold" icon="Fix" />
        <StatCard label="PENDING DEBTS" value={fmt(pendingDebts)} accent="gold" icon="Debt" />
      </div>

      <div className={styles.chartGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Income vs Expenses</h2>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={10}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 14 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#667085", fontSize: 14 }}
                  tickFormatter={(value) => `$${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
                />
                <Tooltip formatter={(value) => fmt(value)} contentStyle={{ borderRadius: 14, border: "1px solid #d0d5dd" }} />
                <Bar dataKey="income" fill="#2fad68" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legend}>
            <LegendDot color="#2fad68" label="Income" />
            <LegendDot color="#ef4444" label="Expenses" />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Spending by Category</h2>
          <div className={styles.categoryLayout}>
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryData} innerRadius={60} outerRadius={88} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.categoryList}>
              {categoryData.map((item) => (
                <div key={item.name} className={styles.categoryRow}>
                  <div className={styles.categoryName}>
                    <span className={styles.categoryDot} style={{ background: item.color }} />
                    {item.name}
                  </div>
                  <span className={styles.categoryPct}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Recent Transactions</h2>
        <div className={styles.recentList}>
          {transactions.slice(0, 6).map((tx) => (
            <div key={tx.id} className={styles.recentRow}>
              <div className={styles.recentLeft}>
                <div className={styles.recentIcon}>{resolveIconGlyph(tx.icon || CAT_ICONS[tx.category])}</div>
                <div>
                  <div className={styles.recentTitle}>{tx.desc || tx.description}</div>
                  <div className={styles.recentMeta}>
                    {tx.category} | {fmtDate(tx.date)}
                  </div>
                </div>
              </div>
              <div className={styles.recentActions}>
                <span className={tx.type === "income" ? styles.incomeAmount : styles.expenseAmount}>
                  {tx.type === "income" ? "+ " : "- "} {fmt(tx.amount)}
                </span>
                <button type="button" className={styles.actionBtn} onClick={() => onEditTx(tx)}>
                  Edit
                </button>
                <button type="button" className={styles.actionBtn} onClick={() => onDeleteTx(tx.id)}>
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent, icon }) {
  return (
    <div className={`${styles.statCard} ${styles[accent]}`}>
      <div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
      </div>
      <div className={styles.statIcon}>{icon}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: color }} />
      {label}
    </div>
  );
}
