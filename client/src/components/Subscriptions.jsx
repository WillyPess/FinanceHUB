import { useMemo } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import styles from "./Subscriptions.module.css";

const FREQ_LABEL  = { weekly:"Weekly", monthly:"Monthly", yearly:"Yearly" };
const FREQ_MONTHS = { weekly:1/4.33,   monthly:1,         yearly:12 };
const FREQ_SHORT  = { weekly:"wk",     monthly:"mo",      yearly:"yr" };

const STATUS_COLOR = { active:"#22c55e", paused:"#f59e0b", cancelled:"#ef4444" };
const STATUS_LABEL = { active:"Active",  paused:"Paused",  cancelled:"Cancelled" };
const STATUS_BG    = { active:"#f0fdf4", paused:"#fffbeb", cancelled:"#fef2f2" };

export default function Subscriptions({ subscriptions, onAdd, onEdit, onDelete }) {
  const active    = subscriptions.filter(s => s.status === "active");
  const paused    = subscriptions.filter(s => s.status === "paused");
  const cancelled = subscriptions.filter(s => s.status === "cancelled");

  const monthlyTotal = useMemo(() =>
    active.reduce((sum, s) => sum + s.amount / (FREQ_MONTHS[s.frequency] || 1), 0)
  , [active]);

  const yearlyTotal = monthlyTotal * 12;

  const upcoming = [...active]
    .sort((a, b) => new Date(a.nextBilling || a.next_billing) - new Date(b.nextBilling || b.next_billing))
    .slice(0, 6);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Subscriptions & Fixed Costs</h1>
          <p className={styles.subtitle}>Manage your recurring payments</p>
        </div>
        <button onClick={onAdd} className={styles.addBtn}>+ Add Subscription</button>
      </div>

      {/* Summary */}
      <div className={styles.summaryGrid}>
        <SummaryCard label="Monthly Cost"  value={fmt(monthlyTotal)} icon="📅" color="#3b82f6" bg="#eff6ff" />
        <SummaryCard label="Annual Cost"   value={fmt(yearlyTotal)}  icon="📆" color="#8b5cf6" bg="#f5f3ff" />
        <SummaryCard label="Active"        value={active.length}     icon="✅" color="#22c55e" bg="#f0fdf4" />
        <SummaryCard label="Paused"        value={paused.length}     icon="⏸️" color="#f59e0b" bg="#fffbeb" />
      </div>

      <div className={styles.bodyGrid}>
        {/* Left: full list */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>All Subscriptions</h3>
          {subscriptions.length === 0 && <p className={styles.empty}>No subscriptions added yet.</p>}

          {["active","paused","cancelled"].map(status => {
            const group = subscriptions.filter(s => s.status === status);
            if (!group.length) return null;
            return (
              <div key={status}>
                <div className={styles.groupLabel} style={{ color: STATUS_COLOR[status] }}>
                  <span className={styles.statusDot} style={{ background: STATUS_COLOR[status] }} />
                  {STATUS_LABEL[status]} ({group.length})
                </div>
                {group.map(s => <SubRow key={s.id} sub={s} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            );
          })}
        </div>

        {/* Right: upcoming + breakdown */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Upcoming Bills</h3>
            {upcoming.length === 0 && <p className={styles.empty}>No upcoming bills.</p>}
            {upcoming.map(s => {
              const nb = s.nextBilling || s.next_billing;
              const daysLeft = nb
                ? Math.ceil((new Date(nb + "T12:00:00") - new Date()) / (1000*60*60*24))
                : null;
              const urgent = daysLeft !== null && daysLeft <= 3;
              return (
                <div key={s.id} className={styles.upcomingRow}>
                  <span className={styles.subIcon}>{s.icon || "📦"}</span>
                  <div className={styles.upcomingInfo}>
                    <div className={styles.upcomingName}>{s.name}</div>
                    <div className={styles.upcomingDate}>{nb ? fmtDate(nb) : "—"}</div>
                  </div>
                  <div className={styles.upcomingRight}>
                    <div className={styles.upcomingAmt}>{fmt(s.amount)}</div>
                    {daysLeft !== null && (
                      <div className={styles.daysTag}
                        style={{ background: urgent ? "#fef2f2" : "#f1f5f9", color: urgent ? "#ef4444" : "#64748b" }}>
                        {daysLeft <= 0 ? "Today!" : `${daysLeft}d`}
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
              {active.map(s => {
                const monthly = s.amount / (FREQ_MONTHS[s.frequency] || 1);
                const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0;
                return (
                  <div key={s.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span style={{ color:"#374151" }}>{s.icon} {s.name}</span>
                      <span style={{ color:"#94a3b8" }}>{fmt(monthly)}/mo ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height:6, background:"#f1f5f9", borderRadius:3 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:"#3b82f6", borderRadius:3, transition:"width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, bg }) {
  return (
    <div style={{ background:bg, borderRadius:14, padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"#94a3b8" }}>{label.toUpperCase()}</div>
        <div style={{ width:32, height:32, background:"#fff", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>{icon}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:800, color }}>{value}</div>
    </div>
  );
}

function SubRow({ sub, onEdit, onDelete }) {
  const nb = sub.nextBilling || sub.next_billing;
  return (
    <div className={styles.subRow}>
      <span className={styles.subIcon}>{sub.icon || "📦"}</span>
      <div className={styles.subInfo}>
        <div className={styles.subName}>{sub.name}</div>
        <div className={styles.subMeta}>
          <span className={styles.badge}>{sub.category}</span>
          <span className={styles.freqTag}>{sub.frequency ? sub.frequency[0].toUpperCase()+sub.frequency.slice(1) : ""}</span>
          {nb && <span className={styles.nextDate}>Due: {fmtDate(nb)}</span>}
        </div>
      </div>
      <div className={styles.subAmount}>
        <div className={styles.subAmtVal}>{fmt(sub.amount)}</div>
        <div className={styles.subAmtPer}>/{sub.frequency === "yearly" ? "yr" : sub.frequency === "weekly" ? "wk" : "mo"}</div>
      </div>
      <button onClick={() => onEdit(sub)} className={styles.iconBtn}>✏️</button>
      <button onClick={() => onDelete(sub.id)} className={styles.iconBtn}>🗑️</button>
    </div>
  );
}
