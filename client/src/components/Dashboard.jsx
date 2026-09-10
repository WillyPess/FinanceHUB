import { useMemo } from "react";
import { fmt, fmtDate, fmtSignedPercent } from "../utils/formatters.js";
import { CAT_COLORS, TREND_RANGES } from "../constants.js";
import Icon from "./icons.jsx";
import styles from "./Dashboard.module.css";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildTrendPath(values, { width = 400, height = 120, pad = 10 } = {}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => ({
    x: pad + i * stepX,
    y: height - pad - ((v - min) / range) * (height - pad * 2),
  }));

  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} ${points[points.length - 1].x.toFixed(1)},${height - pad} ${points[0].x.toFixed(1)},${height - pad}`;
  return { points, line, area, last: points[points.length - 1], width, height, pad };
}

export default function Dashboard({ data, onGoToBills, onGoToInvestments, onGoToDebts, onGoToTransactions, onGoToAssets, investmentRange, onRangeChange }) {
  const { transactions, debts, subscriptions, investments, investmentTrend, assets = [] } = data;
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long" });

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const iOwePending = debts
    .filter((d) => (d.direction || "i-owe") === "i-owe")
    .reduce((sum, d) => sum + Math.max(d.total - d.paid, 0), 0);
  const owedPending = debts
    .filter((d) => d.direction === "owed")
    .reduce((sum, d) => sum + Math.max(d.total - d.paid, 0), 0);
  const settledDebt = [...debts].reverse().find((d) => d.paid >= d.total && d.total > 0);

  const fixedMonthly = subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => {
      if (item.frequency === "yearly") return sum + item.amount / 12;
      if (item.frequency === "weekly") return sum + item.amount * 4.33;
      return sum + item.amount;
    }, 0);

  const investmentSummary = investments?.summary || {};

  const assetsNet = assets.reduce((sum, asset) => sum + (asset.stats?.netProfit || 0), 0);
  const assetsWeeklyIncome = assets
    .filter((asset) => asset.status === "active")
    .reduce((sum, asset) => sum + (asset.stats?.weeklyEquivalentIncome || 0), 0);

  const spendingSeries = useMemo(() => {
    const key = monthKey(now);
    const byDay = new Map();
    transactions
      .filter((t) => t.type === "expense" && (t.date || "").startsWith(key))
      .forEach((t) => byDay.set(t.date, (byDay.get(t.date) || 0) + t.amount));

    const days = [...byDay.keys()].sort();
    let running = 0;
    return days.map((day) => {
      running += byDay.get(day);
      return running;
    });
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastMonthExpense = useMemo(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = monthKey(prev);
    return transactions.filter((t) => t.type === "expense" && (t.date || "").startsWith(key)).reduce((s, t) => s + t.amount, 0);
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  const spendingDeltaPct = lastMonthExpense > 0 ? ((totalExpense - lastMonthExpense) / lastMonthExpense) * 100 : null;
  const spendingChart = buildTrendPath(spendingSeries);

  const investmentValues = (investmentTrend || []).map((point) => point.value);
  const investmentChart = buildTrendPath(investmentValues);

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

  const topCategoryValue = categoryData[0]?.value || 1;

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

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
      .slice(0, 6);
  }, [subscriptions]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Your financial overview</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Balance" value={fmt(balance)} icon="salary" highlight />
        <StatCard label="Fixed / month" value={fmt(fixedMonthly)} icon="repeat" onClick={onGoToBills} />
        <StatCard label="Pending debts" value={fmt(iOwePending)} icon="exchange" onClick={onGoToDebts} />
        <StatCard label="Investments" value={fmt(investmentSummary.portfolioValue || 0)} icon="chart" onClick={onGoToInvestments} />
      </div>

      <div className={styles.chartRow}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Spending — {monthName}</div>
              <div className={`${styles.cardFigure} ledgerTotal`}>{fmt(totalExpense)}</div>
              {spendingDeltaPct != null && (
                <div className={spendingDeltaPct > 0 ? styles.deltaNegative : styles.deltaPositive}>
                  {spendingDeltaPct > 0 ? "↑" : "↓"} {fmtSignedPercent(Math.abs(spendingDeltaPct)).replace("+", "")} vs last month
                </div>
              )}
            </div>
            <button type="button" className={styles.linkBtn} onClick={onGoToTransactions}>Transactions</button>
          </div>
          <TrendChart chart={spendingChart} color="var(--accent)" emptyLabel="No spending recorded yet this month" />
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Investments</div>
              <div className={`${styles.cardFigure} ledgerTotal`}>{fmt(investmentSummary.portfolioValue || 0)}</div>
              {investmentSummary.dayMove != null && (
                <div className={investmentSummary.dayMove >= 0 ? styles.deltaPositive : styles.deltaNegative}>
                  {investmentSummary.dayMove >= 0 ? "↑" : "↓"} {fmt(Math.abs(investmentSummary.dayMove))} today
                </div>
              )}
            </div>
            <div className={styles.rangeTabs}>
              {TREND_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => onRangeChange?.(range)}
                  className={`${styles.rangeTab} ${investmentRange === range ? styles.rangeTabActive : ""}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <TrendChart chart={investmentChart} color="var(--positive)" emptyLabel="No investments tracked yet" />
        </section>
      </div>

      <section className={`${styles.card} ${styles.wide}`}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Recent Transactions</div>
          <button type="button" className={styles.linkBtn} onClick={onGoToTransactions}>View all</button>
        </div>
        {recentTransactions.length === 0 && (
          <div className={styles.emptyState}>No transactions yet — add your first one from the Transactions page.</div>
        )}
        <div className={styles.txList}>
          {recentTransactions.map((tx) => {
            const desc = tx.desc || tx.description || "";
            const color = CAT_COLORS[tx.category] || CAT_COLORS.Other;
            return (
              <div key={tx.id} className={styles.txRow}>
                <div className={styles.txIconWrap} style={{ color }}>
                  <Icon name={tx.icon || "package"} size={16} />
                </div>
                <div className={styles.txInfo}>
                  <div className={styles.txName}>{desc}</div>
                  <div className={styles.txMeta}>
                    {fmtDate(tx.date)}
                    {tx.debt_id && <span className={styles.consolidated}>Consolidated</span>}
                  </div>
                </div>
                <span className={styles.txTag} style={{ background: `${color}29`, color }}>{tx.category}</span>
                <div className={tx.type === "income" ? styles.txAmtPositive : styles.txAmtNegative}>
                  {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.splitRow}>
        <section className={styles.card}>
          <div className={styles.cardTitle} style={{ marginBottom: 16 }}>Top Categories</div>
          {categoryData.length === 0 && <div className={styles.emptyState}>No expense data yet.</div>}
          {categoryData.slice(0, 6).map((item) => (
            <div key={item.name} className={styles.catRow}>
              <span className={styles.catDot} style={{ background: item.color }} />
              <span className={styles.catName}>{item.name}</span>
              <div className={styles.catTrack}>
                <div className={styles.catFill} style={{ width: `${(item.value / topCategoryValue) * 100}%`, background: item.color }} />
              </div>
              <span className={styles.catAmt}>{fmt(item.value)}</span>
            </div>
          ))}
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle} style={{ marginBottom: 4 }}>Debts</div>
          <div className={styles.debtRow}>
            <span className={styles.debtLabel}>I owe (pending)</span>
            <span className={styles.debtValue}>{fmt(iOwePending)}</span>
          </div>
          <div className={styles.debtRow}>
            <span className={styles.debtLabel}>Owed to me (pending)</span>
            <span className={`${styles.debtValue} ${styles.debtPositive}`}>{fmt(owedPending)}</span>
          </div>
          <div className={styles.debtDivider} />
          {settledDebt ? (
            <button type="button" className={styles.debtNote} onClick={onGoToDebts}>
              <Icon name="exchange" size={14} /> {settledDebt.creditor} settled &middot; in Transactions
            </button>
          ) : (
            <button type="button" className={styles.debtNote} onClick={onGoToDebts}>
              <Icon name="exchange" size={14} /> View all debts
            </button>
          )}
        </section>
      </div>

      {assets.length > 0 && (
        <section className={`${styles.card} ${styles.wide}`}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Assets</div>
              <div className={`${styles.cardFigure} ledgerTotal`}>{fmt(assetsWeeklyIncome)} / wk</div>
              <div className={assetsNet >= 0 ? styles.deltaPositive : styles.deltaNegative}>
                {fmt(assetsNet)} net profit &middot; {assets.length} asset{assets.length === 1 ? "" : "s"}
              </div>
            </div>
            <button type="button" className={styles.linkBtn} onClick={onGoToAssets}>View all</button>
          </div>
          <div className={styles.txList}>
            {assets.slice(0, 5).map((asset) => {
              const net = asset.stats?.netProfit || 0;
              return (
                <div key={asset.id} className={styles.txRow}>
                  <div className={styles.txIconWrap}><Icon name="package" size={16} /></div>
                  <div className={styles.txInfo}>
                    <div className={styles.txName}>{asset.name}</div>
                    <div className={styles.txMeta}>{asset.category || "Uncategorised"} &middot; {fmt(asset.stats?.weeklyEquivalentIncome || 0)}/wk</div>
                  </div>
                  <span className={styles.txTag} style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
                    {asset.status}
                  </span>
                  <div className={net >= 0 ? styles.txAmtPositive : styles.txAmtNegative}>{fmt(net)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={`${styles.card} ${styles.wide}`}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Upcoming — next 30 days</div>
          <button type="button" className={styles.linkBtn} onClick={onGoToBills}>View all</button>
        </div>
        {upcomingBills.length === 0 && <div className={styles.emptyState}>No bills due soon.</div>}
        {upcomingBills.length > 0 && (
          <div className={styles.billTable}>
            <div className={styles.billHead}>
              <span>Due</span><span>Bill</span><span>Frequency</span><span>Amount</span>
            </div>
            {upcomingBills.map((item) => {
              const daysLeft = Math.ceil((new Date(`${item.nextBilling}T00:00:00`) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / MS_PER_DAY);
              return (
                <div key={item.id} className={styles.billLine}>
                  <span className={daysLeft <= 3 ? styles.billBadgeUrgent : styles.billBadge}>{daysLeft <= 0 ? "Today" : `${daysLeft}d`}</span>
                  <span className={styles.billName}><Icon name={item.icon || "package"} size={15} /> {item.name}</span>
                  <span className={styles.billFreq}>{item.frequency}</span>
                  <span className={styles.billAmt}>{fmt(item.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, onClick, highlight }) {
  return (
    <div className={styles.statCard} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statIcon}><Icon name={icon} size={15} /></span>
      </div>
      <div className={highlight ? `${styles.statValue} ledgerTotal` : styles.statValue}>{value}</div>
    </div>
  );
}

function TrendChart({ chart, color, emptyLabel }) {
  if (!chart) {
    return <div className={styles.chartEmpty}>{emptyLabel}</div>;
  }

  const gradientId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={chart.height * 0.22} x2={chart.width} y2={chart.height * 0.22} stroke="var(--border-subtle)" strokeWidth="1" />
        <line x1="0" y1={chart.height * 0.6} x2={chart.width} y2={chart.height * 0.6} stroke="var(--border-subtle)" strokeWidth="1" />
        <polygon points={chart.area} fill={`url(#${gradientId})`} />
        <polyline points={chart.line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={chart.last.x} y1={chart.last.y} x2={chart.last.x} y2={chart.height - chart.pad} stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
        <circle cx={chart.last.x} cy={chart.last.y} r="4" fill={color} />
      </svg>
    </div>
  );
}
