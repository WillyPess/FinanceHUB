import { useMemo, useState } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import { CAT_ICONS } from "../constants.js";
import styles from "./Transactions.module.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expenses" },
];

export default function Transactions({ transactions, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const desc = (tx.desc || tx.description || "").toLowerCase();
      const category = (tx.category || "").toLowerCase();
      const matchesFilter = filter === "all" || tx.type === filter;
      const needle = search.trim().toLowerCase();
      const matchesSearch = !needle || desc.includes(needle) || category.includes(needle);
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>Manage your income and expenses</p>
        </div>
        <button type="button" onClick={onAdd} className={styles.addBtn}>
          + Add Transaction
        </button>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className={styles.searchInput}
          />
        </label>
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
      </div>

      <section className={styles.tableCard}>
        <div className={styles.tableHead}>
          <div>Transaction</div>
          <div>Category</div>
          <div>Date</div>
          <div className={styles.amountHeader}>Amount</div>
          <div />
        </div>

        <div className={styles.tableBody}>
          {filtered.map((tx) => {
            const desc = tx.desc || tx.description || "";
            return (
              <div key={tx.id} className={styles.row}>
                <div className={styles.txCell}>
                  <span className={styles.txIcon}>{tx.icon || CAT_ICONS[tx.category] || "[]"}</span>
                  <span className={styles.txLabel}>{desc}</span>
                </div>
                <div>
                  <span className={styles.badge}>{tx.category}</span>
                </div>
                <div className={styles.dateCell}>{fmtDate(tx.date)}</div>
                <div className={styles.amountCell}>
                  <span className={tx.type === "income" ? styles.income : styles.expense}>
                    {tx.type === "income" ? "↗" : "↘"} {fmt(tx.amount)}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => onEdit(tx)} className={styles.iconBtn}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(tx.id)} className={styles.deleteBtn}>
                    Del
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && <div className={styles.empty}>No transactions found.</div>}
        </div>
      </section>
    </div>
  );
}
