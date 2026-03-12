import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fmt, fmtCompactCurrency, fmtDate } from "../utils/formatters.js";
import { CAT_COLORS, CAT_ICONS, resolveIconGlyph } from "../constants.js";
import styles from "./Dashboard.module.css";

const INVESTMENT_TIMEFRAMES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

export default function Dashboard({ data, onEditTx, onDeleteTx, onChangeInvestmentRange }) {
  const { transactions, debts, subscriptions, investments, investmentTrend, investmentRange } = data;
  const now = new Date();
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const pendingDebts = debts.reduce((sum, debt) => sum + Math.max(debt.total - debt.paid, 0), 0);
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
        <StatCard label="BALANCE" value={fmt(balance)} accent="blue" icon="Net" />
        <StatCard label="FIXED / MONTH" value={fmt(fixedMonthly)} accent="gold" icon="Fix" />
        <StatCard label="PENDING DEBTS" value={fmt(pendingDebts)} accent="gold" icon="Debt" />
        <StatCard label="INVESTMENTS" value={fmt(investmentSummary.portfolioValue || investmentSummary.currentValue || 0)} accent="green" icon="Inv" />
      </div>

      <div className={styles.chartGrid}>
        <section className={`${styles.card} ${styles.trendCard}`}>
          <div className={styles.trendHeader}>
            <div>
              <h2 className={styles.cardTitle}>Total Trend</h2>
              <div className={styles.trendValueRow}>
                <span className={styles.trendValue}>{fmt(totalToday)}</span>
                <span className={trendDelta >= 0 ? styles.trendUp : styles.trendDown}>
                  {trendDelta >= 0 ? "+" : "-"} {formatPct(Math.abs(trendDeltaPct))}
                </span>
                <span className={trendDelta >= 0 ? styles.trendGain : styles.trendLoss}>
                  {trendDelta >= 0 ? "+" : "-"}
                  {fmt(Math.abs(trendDelta))} {investmentRange || "1M"}
                </span>
              </div>
              <div className={styles.trendSummaryRow}>
                <SummaryChip label="Total Today" value={fmt(totalToday)} tone="neutral" />
                <SummaryChip label="Remaining This Month" value={fmt(remainingCommittedThisMonth)} tone="warning" />
                <SummaryChip label="Projected End Of Month" value={fmt(projectedEndOfMonth)} tone={projectedEndOfMonth >= 0 ? "positive" : "negative"} />
              </div>
              <div className={styles.trendCaption}>
                Total today = transactions + investments +/- debts
                <span className={styles.captionDivider}>|</span>
                Monthly commitments {fmt(fixedMonthly)}
                <span className={styles.captionDivider}>|</span>
                {investmentSummary.marketStatus?.message || "Price cache refresh every 45s"}
              </div>
            </div>
          </div>

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
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="investmentTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 13 }} minTickGap={18} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#667085", fontSize: 13 }}
                  width={72}
                  tickFormatter={(value) => fmtCompactCurrency(value)}
                />
                <Tooltip
                  formatter={(value) => fmt(value)}
                  labelFormatter={(_label, payload) => formatTooltipDate(payload?.[0]?.payload?.date)}
                  contentStyle={{ borderRadius: 14, border: "1px solid #d0d5dd" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#investmentTrendFill)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: "#3b82f6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend}>
            <LegendDot color="#3b82f6" label="Total portfolio value" />
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
              {!categoryData.length && <div className={styles.emptyState}>No expense data yet.</div>}
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

function SummaryChip({ label, value, tone }) {
  return (
    <div className={`${styles.summaryChip} ${styles[tone] || ""}`}>
      <span className={styles.summaryChipLabel}>{label}</span>
      <span className={styles.summaryChipValue}>{value}</span>
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
