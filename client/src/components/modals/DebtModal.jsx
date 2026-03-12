import { useState } from "react";
import s from "./Modal.module.css";

export default function DebtModal({ initial, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    creditor: initial?.creditor || "",
    total: initial?.total?.toString() || "",
    paid: initial?.paid?.toString() || "0",
    dueDate: initial?.dueDate || initial?.due_date || today,
    note: initial?.note || "",
    id: initial?.id,
  });

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h3 className={s.title}>{initial ? "Edit Debt" : "New Debt"}</h3>
          <button onClick={onClose} className={s.close}>x</button>
        </div>
        {[["creditor", "Creditor / Name", "text", "Bank, person, etc."], ["total", "Total Amount ($)", "number", "0.00"], ["paid", "Already Paid ($)", "number", "0.00"], ["dueDate", "Due Date", "date", ""], ["note", "Note (optional)", "text", "Details..."]].map(([k, lbl, type, ph]) => (
          <div key={k} className={s.field}>
            <label className={s.label}>{lbl}</label>
            <input type={type} value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} className={s.input} />
          </div>
        ))}
        <button
          onClick={() => {
            if (!f.creditor || !f.total) return;
            onSave({
              ...f,
              total: parseFloat(f.total),
              paid: parseFloat(f.paid || 0),
              id: initial?.id || Date.now().toString(),
            });
          }}
          className={s.saveBtn}
        >
          {initial ? "Save Changes" : "Add Debt"}
        </button>
      </div>
    </div>
  );
}
