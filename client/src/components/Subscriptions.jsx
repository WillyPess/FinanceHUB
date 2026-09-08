import { useMemo } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import Icon from "./icons.jsx";
import styles from "./Subscriptions.module.css";

const FREQ_MONTHS = { weekly: 1 / 4.33, monthly: 1, yearly: 12 };
const STATUS_TONE = { active: "positive", paused: "warning", cancelled: "negative" };
const STATUS_LABEL = { active: "Active", paused: "Paused", cancelled: "Cancelled" };

export default function Subscriptions({ subscriptions, onAdd, onEdit, onDelete }) {
  const normalized = useMemo(
    () => subscriptions.map((item) => ({ ...item, kind: item.kind || "subscription" })),
    [subscriptions]
  );

  const active = normalized.filter((item) => item.status === "active");
  const paused = normalized.filter((item) => item.status === "paused");
  const subscriptionsOnly = normalized.filter((item) => item.kind === "subscription");
  const billsOnly = normalized.filter((item) => item.kind === "bill");

  const monthlyTotal = useMemo(
    () => active.reduce((sum, item) => sum + item.amount / (FREQ_MONTHS[item.frequency] || 1), 0),
    [active]
  );

  const monthlyBills = useMemo(
    () =>
      active
        .filter((item) => item.kind === "bill")
        .reduce((sum, item) => sum + item.amount / (FREQ_MONTHS[item.frequency] || 1), 0),
    [active]
  );

  const upcoming = [...active]
    .sort((a, b) => new Date(a.nextBilling || a.next_billing) - new Date(b.nextBilling || b.next_billing))
    .slice(0, 6);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fixed Costs</h1>
          <p className={styles.subtitle}>Manage subscriptions, bills and recurring payments</p>
        </div>
        <button type="button" onClick={onAdd} className={styles.addBtn}>+ Add Fixed Cost</button>
      </div>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Monthly Fixed" value={fmt(monthlyTotal)} hint="All" />
        <SummaryCard label="Bills / Month" value={fmt(monthlyBills)} hint="Bills" />
        <SummaryCard label="Subscriptions" value={subscriptionsOnly.length} hint="Subs" />
        <SummaryCard label="Bills" value={billsOnly.length} hint="Acct" />
      </div>

      <div className={styles.bodyGrid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>All Fixed Costs</h3>
          {normalized.length === 0 && <p className={styles.empty}>No fixed costs added yet.</p>}

          {["active", "paused", "cancelled"].map((status) => {
            const group = normalized.filter((item) => item.status === status);
            if (!group.length) return null;

            return (
              <div key={status}>
                <div className={`${styles.groupLabel} ${styles[STATUS_TONE[status]]}`}>
                  <span className={`${styles.statusDot} ${styles[`${STATUS_TONE[status]}Dot`]}`} />
                  {STATUS_LABEL[status]} ({group.length})
                </div>
                {group.map((item) => (
                  <SubRow key={item.id} sub={item} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            );
          })}
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Upcoming Charges</h3>
            {upcoming.length === 0 && <p className={styles.empty}>No upcoming bills.</p>}

            {upcoming.map((item) => {
              const nextBilling = item.nextBilling || item.next_billing;
              const daysLeft = nextBilling
                ? Math.ceil((new Date(`${nextBilling}T12:00:00`) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              const urgent = daysLeft !== null && daysLeft <= 3;

              return (
                <div key={item.id} className={styles.upcomingRow}>
                  <span className={styles.subIcon}><Icon name={item.icon || "package"} size={16} /></span>
                  <div className={styles.upcomingInfo}>
                    <div className={styles.upcomingName}>{item.name}</div>
                    <div className={styles.upcomingDate}>{item.kind === "bill" ? "Bill" : "Subscription"} &middot; {nextBilling ? fmtDate(nextBilling) : "-"}</div>
                  </div>
                  <div className={styles.upcomingRight}>
                    <div className={styles.upcomingAmt}>{fmt(item.amount)}</div>
                    {daysLeft !== null && (
                      <div className={urgent ? styles.daysTagUrgent : styles.daysTag}>
                        {daysLeft <= 0 ? "Today" : `${daysLeft}d`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {active.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Monthly Cost Breakdown</h3>
              {active.map((item) => {
                const monthly = item.amount / (FREQ_MONTHS[item.frequency] || 1);
                const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0;

                return (
                  <div key={item.id} className={styles.breakdownRow}>
                    <div className={styles.breakdownLabelRow}>
                      <span className={styles.breakdownName}>{item.name}</span>
                      <span className={styles.breakdownAmt}>{fmt(monthly)}/mo ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className={styles.breakdownTrack}>
                      <div className={styles.breakdownFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Overview</h3>
            <div className={styles.overviewList}>
              <OverviewRow label="Active items" value={active.length} />
              <OverviewRow label="Paused items" value={paused.length} />
              <OverviewRow label="Subscription items" value={subscriptionsOnly.length} />
              <OverviewRow label="Bill items" value={billsOnly.length} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryTop}>
        <div className={styles.summaryLabel}>{label}</div>
        <div className={styles.summaryHint}>{hint}</div>
      </div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  );
}

function OverviewRow({ label, value }) {
  return (
    <div className={styles.overviewRow}>
      <span className={styles.overviewLabel}>{label}</span>
      <strong className={styles.overviewValue}>{value}</strong>
    </div>
  );
}

function SubRow({ sub, onEdit, onDelete }) {
  const nextBilling = sub.nextBilling || sub.next_billing;

  return (
    <div className={styles.subRow}>
      <div className={styles.subMain}>
        <span className={styles.subIcon}><Icon name={sub.icon || "package"} size={16} /></span>
        <div className={styles.subInfo}>
          <div className={styles.subName}>{sub.name}</div>
          <div className={styles.subMeta}>
            <span className={styles.badge}>{sub.kind === "bill" ? "Bill" : "Subscription"}</span>
            <span className={styles.badge}>{sub.category}</span>
            <span className={styles.freqTag}>{sub.frequency ? `${sub.frequency[0].toUpperCase()}${sub.frequency.slice(1)}` : ""}</span>
            {nextBilling && <span className={styles.nextDate}>Due: {fmtDate(nextBilling)}</span>}
          </div>
        </div>
      </div>
      <div className={styles.subEnd}>
        <div className={styles.subAmount}>
          <div className={styles.subAmtVal}>{fmt(sub.amount)}</div>
          <div className={styles.subAmtPer}>/{sub.frequency === "yearly" ? "yr" : sub.frequency === "weekly" ? "wk" : "mo"}</div>
        </div>
        <button onClick={() => onEdit(sub)} className={styles.iconBtn}>Edit</button>
        <button onClick={() => onDelete(sub.id)} className={styles.iconBtn}>Del</button>
      </div>
    </div>
  );
}
