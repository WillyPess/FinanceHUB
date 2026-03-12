import { useMemo } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import { resolveIconGlyph } from "../constants.js";
import styles from "./Subscriptions.module.css";

const FREQ_MONTHS = { weekly: 1 / 4.33, monthly: 1, yearly: 12 };
const STATUS_COLOR = { active: "#22c55e", paused: "#f59e0b", cancelled: "#ef4444" };
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
        <button onClick={onAdd} className={styles.addBtn}>+ Add Fixed Cost</button>
      </div>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Monthly Fixed" value={fmt(monthlyTotal)} hint="All" color="#3b82f6" bg="#eff6ff" />
        <SummaryCard label="Bills / Month" value={fmt(monthlyBills)} hint="Bills" color="#8b5cf6" bg="#f5f3ff" />
        <SummaryCard label="Subscriptions" value={subscriptionsOnly.length} hint="Subs" color="#22c55e" bg="#f0fdf4" />
        <SummaryCard label="Bills" value={billsOnly.length} hint="Acct" color="#f59e0b" bg="#fffbeb" />
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
                <div className={styles.groupLabel} style={{ color: STATUS_COLOR[status] }}>
                  <span className={styles.statusDot} style={{ background: STATUS_COLOR[status] }} />
                  {STATUS_LABEL[status]} ({group.length})
                </div>
                {group.map((item) => (
                  <SubRow key={item.id} sub={item} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                  <span className={styles.subIcon}>{resolveIconGlyph(item.icon || "package")}</span>
                  <div className={styles.upcomingInfo}>
                    <div className={styles.upcomingName}>{item.name}</div>
                    <div className={styles.upcomingDate}>{item.kind === "bill" ? "Bill" : "Subscription"}</div>
                    <div className={styles.upcomingDate}>{nextBilling ? fmtDate(nextBilling) : "-"}</div>
                  </div>
                  <div className={styles.upcomingRight}>
                    <div className={styles.upcomingAmt}>{fmt(item.amount)}</div>
                    {daysLeft !== null && (
                      <div
                        className={styles.daysTag}
                        style={{ background: urgent ? "#fef2f2" : "#f1f5f9", color: urgent ? "#ef4444" : "#64748b" }}
                      >
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
                  <div key={item.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, gap: 8 }}>
                      <span style={{ color: "#374151" }}>{item.icon} {item.name} | {item.kind === "bill" ? "Bill" : "Subscription"}</span>
                      <span style={{ color: "#94a3b8" }}>{fmt(monthly)}/mo ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#3b82f6", borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Overview</h3>
            <div style={{ display: "grid", gap: 12 }}>
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

function SummaryCard({ label, value, hint, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#94a3b8" }}>{label.toUpperCase()}</div>
        <div style={{ minWidth: 36, height: 32, padding: "0 8px", background: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {hint}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function OverviewRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eef1ee", paddingBottom: 10 }}>
      <span style={{ color: "#667085", fontSize: 14 }}>{label}</span>
      <strong style={{ color: "#101828" }}>{value}</strong>
    </div>
  );
}

function SubRow({ sub, onEdit, onDelete }) {
  const nextBilling = sub.nextBilling || sub.next_billing;

  return (
    <div className={styles.subRow}>
      <span className={styles.subIcon}>{resolveIconGlyph(sub.icon || "package")}</span>
      <div className={styles.subInfo}>
        <div className={styles.subName}>{sub.name}</div>
        <div className={styles.subMeta}>
          <span className={styles.badge}>{sub.kind === "bill" ? "Bill" : "Subscription"}</span>
          <span className={styles.badge}>{sub.category}</span>
          <span className={styles.freqTag}>{sub.frequency ? `${sub.frequency[0].toUpperCase()}${sub.frequency.slice(1)}` : ""}</span>
          {nextBilling && <span className={styles.nextDate}>Due: {fmtDate(nextBilling)}</span>}
        </div>
      </div>
      <div className={styles.subAmount}>
        <div className={styles.subAmtVal}>{fmt(sub.amount)}</div>
        <div className={styles.subAmtPer}>/{sub.frequency === "yearly" ? "yr" : sub.frequency === "weekly" ? "wk" : "mo"}</div>
      </div>
      <button onClick={() => onEdit(sub)} className={styles.iconBtn}>Edit</button>
      <button onClick={() => onDelete(sub.id)} className={styles.iconBtn}>Del</button>
    </div>
  );
}
