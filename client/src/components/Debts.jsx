import { useMemo, useState } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import styles from "./Debts.module.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "i-owe", label: "I Owe" },
  { key: "owed", label: "Owed to Me" },
];

export default function Debts({ debts, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");

  const normalized = useMemo(() => {
    return debts.map((debt) => {
      const dueDate = debt.dueDate || debt.due_date;
      const remaining = Math.max(debt.total - debt.paid, 0);
      const direction = inferDirection(debt);

      let status = "pending";
      if (remaining === 0) status = "paid";
      else if (debt.paid > 0) status = "partial";

      return { ...debt, dueDate, remaining, direction, status };
    });
  }, [debts]);

  const visible = normalized.filter((debt) => {
    if (filter === "pending") return debt.status !== "paid";
    if (filter === "i-owe") return debt.direction === "i-owe";
    if (filter === "owed") return debt.direction === "owed";
    return true;
  });

  const iOwePending = normalized.filter((d) => d.direction === "i-owe" && d.status !== "paid").reduce((sum, d) => sum + d.remaining, 0);
  const owedPending = normalized.filter((d) => d.direction === "owed" && d.status !== "paid").reduce((sum, d) => sum + d.remaining, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Debts</h1>
          <p className={styles.subtitle}>Track what you owe and what's owed to you</p>
        </div>
        <button type="button" onClick={onAdd} className={styles.addBtn}>
          + Add Debt
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.oweCard}`}>
          <div className={styles.summaryLabel}>I OWE (PENDING)</div>
          <div className={styles.oweValue}>{fmt(iOwePending)}</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.owedCard}`}>
          <div className={styles.summaryLabel}>OWED TO ME (PENDING)</div>
          <div className={styles.owedValue}>{fmt(owedPending)}</div>
        </div>
      </div>

      <div className={styles.filterGroup}>
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`${styles.filterBtn} ${filter === item.key ? styles.active : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {visible.map((debt) => (
          <article key={debt.id} className={styles.card}>
            <div className={styles.chips}>
              <span className={`${styles.chip} ${styles[debt.status]}`}>{debt.status}</span>
              <span className={styles.chipMuted}>{debt.direction === "owed" ? "Owed to me" : "I owe"}</span>
            </div>

            <div className={styles.amountRow}>
              <div>
                <h3 className={styles.creditor}>{debt.creditor}</h3>
                <p className={styles.note}>{debt.note || "No note"}</p>
              </div>
              <div className={debt.direction === "owed" ? styles.positiveAmount : styles.negativeAmount}>
                {fmt(debt.remaining)}
              </div>
            </div>

            <div className={styles.metaRow}>Due {fmtDate(debt.dueDate)}</div>

            <div className={styles.actions}>
              <button type="button" onClick={() => onEdit(debt)} className={styles.iconBtn}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(debt.id)} className={styles.deleteBtn}>
                Del
              </button>
            </div>
          </article>
        ))}

        {visible.length === 0 && <div className={styles.empty}>No debts found for this filter.</div>}
      </div>
    </div>
  );
}

function inferDirection(debt) {
  const creditor = (debt.creditor || "").toLowerCase();
  const note = (debt.note || "").toLowerCase();
  if (note.includes("owed to me") || note.includes("split") || note.includes("they owe")) return "owed";
  if (creditor.includes("sarah") || creditor.includes("mike")) return "owed";
  return "i-owe";
}
