import { fmt, fmtDate } from "../utils/formatters.js";
import s from "./Debts.module.css";

export default function Debts({ debts, onAdd, onEdit, onDelete }) {
  return (
    <div className={s.page}>
      <div className={s.header}>
        <div><h1 className={s.title}>Debts</h1><p className={s.sub}>Track what you owe</p></div>
        <button onClick={onAdd} className={s.addBtn}>+ Add Debt</button>
      </div>
      <div className={s.grid}>
        {debts.map(d => {
          const remaining = d.total - d.paid;
          const pct = d.total > 0 ? Math.min((d.paid/d.total)*100, 100) : 0;
          const done = remaining <= 0;
          const topColor = done ? "#22c55e" : remaining > 1000 ? "#ef4444" : "#f59e0b";
          return (
            <div key={d.id} className={s.card} style={{borderTop:`4px solid ${topColor}`}}>
              <div className={s.cardHead}>
                <div>
                  <div className={s.creditor}>{d.creditor}</div>
                  <div className={s.due}>Due: {fmtDate(d.due_date)}</div>
                </div>
                <div className={s.actions}>
                  <button onClick={()=>onEdit(d)} className={s.iBtn}>✏️</button>
                  <button onClick={()=>onDelete(d.id)} className={s.iBtn}>🗑️</button>
                </div>
              </div>
              {d.note && <div className={s.note}>{d.note}</div>}
              <div className={s.amounts}>
                <span>Paid: <b style={{color:"#22c55e"}}>{fmt(d.paid)}</b></span>
                <span>Total: <b>{fmt(d.total)}</b></span>
              </div>
              <div className={s.bar}>
                <div className={s.fill} style={{width:`${pct}%`, background: done?"#22c55e":pct>75?"#22c55e":"#f59e0b"}}/>
              </div>
              <div className={s.foot}>
                <span style={{color:done?"#22c55e":"#ef4444",fontWeight:700}}>{done?"✓ Paid off!":`Remaining: ${fmt(remaining)}`}</span>
                <span style={{color:"#94a3b8"}}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
        {debts.length === 0 && <div className={s.empty}>No debts recorded. Great job! 🎉</div>}
      </div>
    </div>
  );
}
