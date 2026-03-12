import { useState } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import { CAT_ICONS } from "../constants.js";
import s from "./Transactions.module.css";

export default function Transactions({ transactions, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = transactions.filter(t => {
    if (filter !== "all" && t.type !== filter) return false;
    const q = search.toLowerCase();
    if (q && !t.description?.toLowerCase().includes(q) && !t.category?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div><h1 className={s.title}>Transactions</h1><p className={s.sub}>Manage your income and expenses</p></div>
        <button onClick={onAdd} className={s.addBtn}>+ Add Transaction</button>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions..." className={s.searchInput} />
          </div>
          <div className={s.filters}>
            {["all","income","expense"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`${s.fBtn} ${filter===f?s.active:""}`}>
                {f[0].toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <table className={s.table}>
          <thead><tr>
            <th>Transaction</th><th>Category</th><th>Date</th>
            <th style={{textAlign:"right"}}>Amount</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map(tx=>(
              <tr key={tx.id}>
                <td><div className={s.txName}><span className={s.txIcon}>{tx.icon||CAT_ICONS[tx.category]||"📦"}</span><span className={s.txDesc}>{tx.description}</span></div></td>
                <td><span className={s.badge}>{tx.category}</span></td>
                <td className={s.dateCell}>{fmtDate(tx.date)}</td>
                <td style={{textAlign:"right"}}><span className={tx.type==="income"?s.inc:s.exp}>{tx.type==="income"?"↗":"↘"} {fmt(tx.amount)}</span></td>
                <td className={s.actions}>
                  <button onClick={()=>onEdit(tx)} className={s.iBtn}>✏️</button>
                  <button onClick={()=>onDelete(tx.id)} className={s.iBtn}>🗑️</button>
                </td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={5} className={s.empty}>No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
