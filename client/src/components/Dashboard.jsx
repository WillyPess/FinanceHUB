import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fmt, fmtDate, fmtSignedPercent } from "../utils/formatters.js";
import { CAT_COLORS, CAT_ICONS, resolveIconGlyph } from "../constants.js";
import styles from "./Dashboard.module.css";

const INVESTMENT_TIMEFRAMES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function Dashboard({ data, onEditTx, onDeleteTx, onChangeInvestmentRange, onGoToBills, onGoToInvestments, onGoToDebts }) {
  const { transactions, debts, subscriptions, investments, investmentTrend, investmentRange } = data;
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalDebtOwed = debts.reduce((sum, debt) => sum + (Number(debt.total) || 0), 0);
  const pendingDebts = debts.reduce((sum, debt) => sum + Math.max(debt.total - debt.paid, 0), 0);
  const debtsPaid = Math.max(totalDebtOwed - pendingDebts, 0);
  const netDebtImpact = debts.reduce((sum, debt) => {
    const remaining = Math.max((Number(debt.total) || 0) - (Number(debt.paid) || 0), 0);
    return sum + (inferDebtDirection(debt) === "owed" ? remaining : -remaining);
  }, 0);
  const fixedMonthly = subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => {
      if (item.frequency === "yearly") return sum + item.amount / 12;
      if (item.frequency === "weekly") return sum + item.amount * 4.33;
      return sum + item.amount;
    }, 0);
  const remainingCommittedThisMonth = subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + remainingOccurrencesThisMonth(item, now), 0);

  const investmentSummary = investments?.summary || {};
  const investmentSeries = Array.isArray(investmentTrend) ? investmentTrend : [];
  const trendData = useMemo(() => {
    const series = investmentSeries.length
      ? investmentSeries
      : [{ timestamp: Date.now(), date: new Date().toISOString(), label: "Today", value: 0 }];

    return series.map((point) => {
      const pointTime = resolveTimestamp(point);
      const balanceAtPoint = transactions.reduce((sum, tx) => {
        const txTime = resolveTimestamp({ date: tx.date || tx.created_at, timestamp: tx.created_at });
        if (txTime > pointTime) return sum;
        return sum + (tx.type === "income" ? tx.amount : -tx.amount);
      }, 0);

      const netDebtImpactAtPoint = debts.reduce((sum, debt) => {
        const debtTime = resolveTimestamp({ date: debt.created_at || debt.dueDate, timestamp: debt.created_at });
        if (debtTime > pointTime) return sum;
        const remaining = Math.max((Number(debt.total) || 0) - (Number(debt.paid) || 0), 0);
        return sum + (inferDebtDirection(debt) === "owed" ? remaining : -remaining);
      }, 0);

      return {
        ...point,
        value: Number((point.value + balanceAtPoint + netDebtImpactAtPoint).toFixed(2)),
      };
    });
  }, [debts, investmentSeries, subscriptions, transactions]);
  const trendStart = trendData[0]?.value || 0;
  const trendEnd = trendData[trendData.length - 1]?.value || 0;
  const trendDelta = trendEnd - trendStart;
  const trendDeltaPct = trendStart > 0 ? (trendDelta / trendStart) * 100 : 0;
  const totalToday = trendEnd || balance + (investmentSummary.portfolioValue || investmentSummary.currentValue || 0) + netDebtImpact;
  const projectedEndOfMonth = totalToday - remainingCommittedThisMonth;

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
        <StatCard label="BALANCE" value={fmt(balance)} accent="blue" icon="◆" />
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

        <div className={styles.stackCol}>
          <section className={`${styles.card} ${styles.trendCard}`}>
            <div className={styles.trendHeader}>
              <h2 className={styles.cardTitle}>Total Trend</h2>
              <span className={trendDelta >= 0 ? styles.trendUp : styles.trendDown}>
                {trendDelta >= 0 ? "+" : "-"}{formatPct(Math.abs(trendDeltaPct))}
              </span>
            </div>
            <div className={styles.trendValue}>{fmt(totalToday)}</div>

            <div className={styles.timeframeRow}>
              {INVESTMENT_TIMEFRAMES.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={range === investmentRange ? styles.timeframeActive : styles.timeframeBtn}
                  onClick={() => onChangeInvestmentRange?.(range)}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trendData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="investmentTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#7d83b8", fontSize: 11 }} minTickGap={24} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => fmt(value)}
                    labelFormatter={(_label, payload) => formatTooltipDate(payload?.[0]?.payload?.date)}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "#1d2247", color: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent-blue)"
                    strokeWidth={2.5}
                    fill="url(#investmentTrendFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: "var(--accent-blue)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className={`${styles.card} ${styles.miniCard}`} onClick={onGoToInvestments} role="button" tabIndex={0}>
            <div className={styles.miniHeader}>
              <span className={styles.subCardTitle}>Invest in My Future</span>
            </div>
            <div className={styles.miniValue}>{fmt(investmentSummary.portfolioValue || investmentSummary.currentValue || 0)}</div>
            <div className={(investmentSummary.totalGain || 0) >= 0 ? styles.miniPositive : styles.miniNegative}>
              {fmtSignedPercent(investmentSummary.totalGainPct || 0)} all-time
            </div>
          </section>

          <section className={`${styles.card} ${styles.miniCard}`} onClick={onGoToDebts} role="button" tabIndex={0}>
            <div className={styles.miniHeader}>
              <span className={styles.subCardTitle}>Paying Off Loans</span>
            </div>
            <div className={styles.miniValue}>{fmt(debtsPaid)}</div>
            <div className={styles.miniMuted}>paid toward debts &middot; you still owe {fmt(pendingDebts)}</div>
          </section>
        </div>
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
          {!transactions.length && <div className={styles.emptyState}>No transactions yet.</div>}
        </div>
      </section>
    </div>
  );
}

function resolveTimestamp(point) {
  if (Number.isFinite(point?.timestamp)) return Number(point.timestamp);
  if (point?.date) return new Date(point.date).getTime();
  return 0;
}

function inferDebtDirection(debt) {
  const creditor = (debt.creditor || "").toLowerCase();
  const note = (debt.note || "").toLowerCase();
  if (note.includes("owed to me") || note.includes("split") || note.includes("they owe")) return "owed";
  if (creditor.includes("sarah") || creditor.includes("mike")) return "owed";
  return "i-owe";
}

function StatCard({ label, value, accent, icon, onClick }) {
  return (
    <div className={`${styles.statCard} ${styles[accent]}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statValue}>{value}</div>
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

function formatPct(value) {
  return `${(value || 0).toFixed(2)}%`;
}

function formatTooltipDate(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function remainingOccurrencesThisMonth(item, now) {
  const nextBilling = item.nextBilling || item.next_billing;
  if (!nextBilling) return 0;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const current = new Date(`${nextBilling}T00:00:00`);
  if (Number.isNaN(current.getTime())) return 0;

  if (item.frequency === "monthly" || item.frequency === "yearly") {
    return current >= today && current <= monthEnd ? Number(item.amount) || 0 : 0;
  }

  if (item.frequency === "weekly") {
    let total = 0;
    while (current < today) {
      current.setDate(current.getDate() + 7);
    }
    while (current <= monthEnd) {
      total += Number(item.amount) || 0;
      current.setDate(current.getDate() + 7);
    }
    return total;
  }

  return 0;
}
