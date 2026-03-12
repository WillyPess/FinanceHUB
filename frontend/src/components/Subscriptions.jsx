import { useMemo } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import { FREQ_LABELS, FREQ_MONTHS } from "../constants.js";
import s from "./Subscriptions.module.css";

const STATUS_COLOR = { active:"#22c55e", paused:"#f59e0b", cancelled:"#ef4444" };
const STATUS_LABEL = { active:"Active", paused:"Paused", cancelled:"Cancelled" };

export default function Subscriptions({ subscriptions, onAdd, onEdit, onDelete }) {
  const active    = subscriptions.filter(s => s.status === "active");
  const paused    = subscriptions.filter(s => s.status === "paused");
  const cancelled = subscriptions.filter(s => s.status === "cancelled");

  const monthlyTotal = useMemo(() =>
    active.reduce((sum, s) => sum + s.amount / (FREQ_MONTHS[s.frequency] || 1), 0)
  , [active]);

  const upcoming = [...active]
    .sort((a,b) => new Date(a.next_billing) - new Date(b.next_billing))
    .slice(0, 6);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Subscriptions & Fixed Costs</h1>
          <p className={s.sub}>Manage your recurring payments</p>
        </div>
        <button onClick={onAdd} className={s.addBtn}>+ Add Subscription</button>
      </div>

      {/* Summary cards */}
      <div className={s.statsGrid}>
        <StatCard label="MONTHLY COST"  value={fmt(monthlyTotal)}       color="#3b82f6" bg="#eff6ff" icon="📅" />
        <StatCard label="YEARLY COST"   value={fmt(monthlyTotal * 12)}  color="#8b5cf6" bg="#f5f3ff" icon="📆" />
        <StatCard label="ACTIVE"        value={active.length}           color="#22c55e" bg="#f0fdf4" icon="✅" />
        <StatCard label="PAUSED"        value={paused.length}           color="#f59e0b" bg="#fffbeb" icon="⏸️" />
      </div>

      <div className={s.bodyGrid}>
        {/* All subscriptions list */}
        <div className={s.card}>
          <h3 className={s.cardTitle}>All Subscriptions</h3>
          {subscriptions.length === 0 && <p className={s.empty}>No subscriptions added yet.</p>}

          {["active","paused","cancelled"].map(status => {
            const group = subscriptions.filter(x => x.status === status);
            if (!group.length) return null;
            return (
              <div key={status}>
                <div className={s.groupLabel} style={{color: STATUS_COLOR[status]}}>
                  {STATUS_LABEL[status]} ({group.length})
                </div>
                {group.map(sub => <SubRow key={sub.id} sub={sub} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            );
          })}
        </div>

        {/* Right panel */}
        <div>
          {/* Upcoming billing */}
          <div className={s.card} style={{marginBottom:18}}>
            <h3 className={s.cardTitle}>Upcoming Billing</h3>
            {upcoming.length === 0 && <p className={s.empty}>No upcoming payments.</p>}
            {upcoming.map(sub => {
              const daysLeft = Math.ceil((new Date(sub.next_billing + "T12:00:00") - new Date()) / 86400000);
              const urgent = daysLeft <= 3;
              return (
                <div key={sub.id} className={s.upRow}>
                  <span className={s.upIcon}>{sub.icon || "📦"}</span>
                  <div className={s.upInfo}>
                    <div className={s.upName}>{sub.name}</div>
                    <div className={s.upDate}>{fmtDate(sub.next_billing)}</div>
                  </div>
                  <div className={s.upRight}>
                    <div className={s.upAmt}>{fmt(sub.amount)}</div>
                    <div className={s.dayTag} style={{background: urgent?"#fef2f2":"#f1f5f9", color: urgent?"#ef4444":"#64748b"}}>
                      {daysLeft <= 0 ? "Today!" : `${daysLeft}d`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly cost breakdown */}
          {active.length > 0 && (
            <div className={s.card}>
              <h3 className={s.cardTitle}>Monthly Cost Breakdown</h3>
              {active.map(sub => {
                const monthly = sub.amount / (FREQ_MONTHS[sub.frequency] || 1);
                const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0;
                return (
                  <div key={sub.id} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{color:"#374151"}}>{sub.icon} {sub.name}</span>
                      <span style={{color:"#94a3b8"}}>{fmt(monthly)}/mo ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{height:6,background:"#f1f5f9",borderRadius:3}}>
                      <div style={{height:"100%",width:`${pct}%`,background:"#3b82f6",borderRadius:3,transition:"width .5s"}}/>
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

function StatCard({label,value,color,bg,icon}) {
  return (
    <div style={{background:bg,border:"1px solid transparent",borderRadius:14,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#94a3b8"}}>{label}</div>
        <div style={{width:32,height:32,background:"#fff",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>{icon}</div>
      </div>
      <div style={{fontSize:24,fontWeight:800,color}}>{value}</div>
    </div>
  );
}

function SubRow({sub,onEdit,onDelete}) {
  return (
    <div className={s.subRow}>
      <span className={s.subIcon}>{sub.icon||"📦"}</span>
      <div className={s.subInfo}>
        <div className={s.subName}>{sub.name}</div>
        <div className={s.subMeta}>
          <span className={s.badge}>{sub.category}</span>
          <span className={s.freq}>{FREQ_LABELS[sub.frequency]}</span>
          {sub.next_billing && <span className={s.nextDate}>Due: {fmtDate(sub.next_billing)}</span>}
        </div>
      </div>
      <div className={s.subAmt}>
        <div className={s.subAmtVal}>{fmt(sub.amount)}</div>
        <div className={s.subAmtPer}>/{sub.frequency==="yearly"?"yr":sub.frequency==="weekly"?"wk":"mo"}</div>
      </div>
      <button onClick={()=>onEdit(sub)} className={s.iBtn}>✏️</button>
      <button onClick={()=>onDelete(sub.id)} className={s.iBtn}>🗑️</button>
    </div>
  );
}
