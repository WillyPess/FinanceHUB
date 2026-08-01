import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fmt, fmtDate } from "../utils/formatters.js";
import { CAT_COLORS } from "../constants.js";
import styles from "./Dashboard.module.css";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function Dashboard({ data, onGoToBills, onGoToInvestments, onGoToDebts }) {
  const { transactions, debts, subscriptions, investments } = data;
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
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

  const investmentSummary = investments?.summary || {};

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
        color: CAT_COLORS[name] || CAT_COLORS.Other,
      }));
  }, [transactions, totalExpense]);

  const upcomingBills = useMemo(() => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 30);
    return subscriptions
      .filter((item) => item.status === "active" && item.nextBilling)
      .filter((item) => {
        const due = new Date(`${item.nextBilling}T00:00:00`);
        return due >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && due <= cutoff;
      })
      .sort((a, b) => new Date(a.nextBilling) - new Date(b.nextBilling))
      .slice(0, 5);
  }, [subscriptions, now]);
  const upcomingBillsTotal = upcomingBills.reduce((sum, item) => sum + item.amount, 0);

  const cashflowMax = Math.max(totalIncome, totalExpense, 1);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Your financial overview</p>
        </div>
        <button type="button" className={styles.exportBtn}>
          <span className={styles.exportIcon}>&darr;</span>
          Export
        </button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="BALANCE" value={fmt(balance)} accent="blue" icon="◆" highlight />
        <StatCard label="FIXED / MONTH" value={fmt(fixedMonthly)} accent="gold" icon="▤" />
        <StatCard label="PENDING DEBTS" value={fmt(pendingDebts)} accent="magenta" icon="●" onClick={onGoToDebts} />
        <StatCard label="INVESTMENTS" value={fmt(investmentSummary.portfolioValue || investmentSummary.currentValue || 0)} accent="teal" icon="▲" onClick={onGoToInvestments} />
      </div>

      <div className={styles.tripleGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>My Spending for {monthName}</h2>
          <div className={styles.donutCenterWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} innerRadius={64} outerRadius={94} paddingAngle={3} dataKey="value" stroke="none">
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCenter}>
              <span className={styles.donutCenterValue}>{fmt(totalExpense)}</span>
              <span className={styles.donutCenterLabel}>Spent this month</span>
            </div>
          </div>
          <div className={styles.categoryList}>
            {categoryData.slice(0, 6).map((item) => (
              <div key={item.name} className={styles.categoryRow}>
                <div className={styles.categoryName}>
                  <span className={styles.categoryDot} style={{ background: item.color }} />
                  {item.name}
                </div>
                <span className={styles.categoryAmt}>
                  {fmt(item.value)} <span className={styles.categoryPct}>{item.pct}%</span>
                </span>
              </div>
            ))}
            {!categoryData.length && <div className={styles.emptyState}>No expense data yet.</div>}
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>My Cashflow for {monthName}</h2>
          <CashflowBar label="EARNED" value={totalIncome} max={cashflowMax} tone="teal" />
          <CashflowBar label="SPENT" value={totalExpense} max={cashflowMax} tone="magenta" />
          <div className={styles.balanceRow}>
            <span className={balance >= 0 ? styles.balancePositive : styles.balanceNegative}>{fmt(balance)}</span>
            <span className={styles.balanceLabel}>{balance >= 0 ? "REMAINING" : "OVER BUDGET"}</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.billsHeaderRow}>
            <h3 className={styles.subCardTitle}>Upcoming Bills</h3>
            <button type="button" className={styles.linkBtn} onClick={onGoToBills}>View all</button>
          </div>
          <div className={styles.billsMeta}>Due in the next 30 days &middot; {fmt(upcomingBillsTotal)}</div>
          <div className={styles.billsList}>
            {upcomingBills.map((item) => {
              const daysLeft = Math.ceil((new Date(`${item.nextBilling}T00:00:00`) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / MS_PER_DAY);
              return (
                <div key={item.id} className={styles.billRow}>
                  <div className={styles.billInfo}>
                    <span className={styles.billDate}>{daysLeft <= 0 ? "Today" : fmtDate(item.nextBilling)}</span>
                    <span className={styles.billName}>{item.name}</span>
                  </div>
                  <div className={styles.billRight}>
                    <span className={styles.billAmt}>{fmt(item.amount)}</span>
                    <button type="button" className={styles.pillBtn} onClick={onGoToBills}>View</button>
                  </div>
                </div>
              );
            })}
            {!upcomingBills.length && <div className={styles.emptyState}>No bills due soon.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, icon, onClick, highlight }) {
  return (
    <div className={`${styles.statCard} ${styles[accent]}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={highlight ? `${styles.statValue} ledgerTotal` : styles.statValue}>{value}</div>
    </div>
  );
}

function CashflowBar({ label, value, max, tone }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={styles.cashflowRow}>
      <div className={styles.cashflowLabelRow}>
        <span className={styles.cashflowLabel}>{label}</span>
        <span className={styles.cashflowValue}>{fmt(value)}</span>
      </div>
      <div className={styles.cashflowTrack}>
        <div className={`${styles.cashflowFill} ${styles[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

