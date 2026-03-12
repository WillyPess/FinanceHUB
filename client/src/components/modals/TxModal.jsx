import { useState } from "react";
import { CAT_ICONS, TX_CATS } from "../../constants.js";
import s from "./Modal.module.css";

export default function TxModal({ initial, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    type: initial?.type || "expense",
    amount: initial?.amount?.toString() || "",
    category: initial?.category || "Food",
    desc: initial?.desc || initial?.description || "",
    date: initial?.date || today,
    icon: initial?.icon || "",
    id: initial?.id,
  });

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h3 className={s.title}>{initial ? "Edit Transaction" : "New Transaction"}</h3>
          <button onClick={onClose} className={s.close}>x</button>
        </div>
        <div className={s.typeToggle}>
          {["expense", "income"].map((t) => (
            <button
              key={t}
              onClick={() => set("type", t)}
              className={`${s.typeBtn} ${f.type === t ? (t === "income" ? s.income : s.expense) : ""}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={s.field}>
          <label className={s.label}>Description</label>
          <input value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="What was it?" className={s.input} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Amount ($)</label>
          <input type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" className={s.input} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Category</label>
          <select value={f.category} onChange={(e) => { set("category", e.target.value); set("icon", CAT_ICONS[e.target.value] || ""); }} className={s.input}>
            {TX_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label}>Date</label>
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={s.input} />
        </div>
        <button
          onClick={() => {
            if (!f.amount || !f.desc) return;
            onSave({
              ...f,
              amount: parseFloat(f.amount),
              icon: f.icon || CAT_ICONS[f.category] || "package",
              id: initial?.id || Date.now().toString(),
            });
          }}
          className={s.saveBtn}
        >
          {initial ? "Save Changes" : "Add Transaction"}
        </button>
      </div>
    </div>
  );
}
