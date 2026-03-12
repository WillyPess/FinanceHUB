import { useState } from "react";
import { SUB_CATS, SUB_CAT_ICONS } from "../../constants.js";
import s from "./Modal.module.css";

export default function SubModal({ initial, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    kind: initial?.kind || "subscription",
    name: initial?.name || "",
    icon: initial?.icon || "tv",
    category: initial?.category || "Streaming",
    amount: initial?.amount?.toString() || "",
    frequency: initial?.frequency || "monthly",
    nextBilling: initial?.nextBilling || initial?.next_billing || today,
    status: initial?.status || "active",
    note: initial?.note || "",
    id: initial?.id,
  });

  const set = (key, value) => setF((prev) => ({ ...prev, [key]: value }));

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h3 className={s.title}>{initial ? "Edit Fixed Cost" : "New Fixed Cost"}</h3>
          <button onClick={onClose} className={s.close}>x</button>
        </div>

        <div className={s.field}>
          <label className={s.label}>Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["subscription", "Subscription"],
              ["bill", "Bill"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("kind", value)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  border: `2px solid ${f.kind === value ? "#23a36b" : "#e2e8f0"}`,
                  borderRadius: 10,
                  background: f.kind === value ? "#eefbf4" : "#fff",
                  color: f.kind === value ? "#167c52" : "#667085",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.grid2} style={{ marginBottom: 14 }}>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Icon</label>
            <input
              value={f.icon}
              onChange={(e) => set("icon", e.target.value)}
              className={s.input}
              style={{ textAlign: "center", fontSize: 20 }}
              maxLength={16}
            />
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>{f.kind === "bill" ? "Bill Name" : "Name"}</label>
            <input
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={f.kind === "bill" ? "Rent, Electricity..." : "Netflix, Spotify..."}
              className={s.input}
            />
          </div>
        </div>

        <div className={s.grid2} style={{ marginBottom: 14 }}>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Category</label>
            <select
              value={f.category}
              onChange={(e) => {
                set("category", e.target.value);
                if (!initial) set("icon", SUB_CAT_ICONS[e.target.value] || "package");
              }}
              className={s.input}
            >
              {SUB_CATS.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Frequency</label>
            <select value={f.frequency} onChange={(e) => set("frequency", e.target.value)} className={s.input}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className={s.grid2} style={{ marginBottom: 14 }}>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Amount ($)</label>
            <input type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" className={s.input} />
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Next Billing Date</label>
            <input type="date" value={f.nextBilling} onChange={(e) => set("nextBilling", e.target.value)} className={s.input} />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Status</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["active", "Active", "#f0fdf4", "#22c55e"],
              ["paused", "Paused", "#fffbeb", "#f59e0b"],
              ["cancelled", "Cancelled", "#fef2f2", "#ef4444"],
            ].map(([value, label, bg, color]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("status", value)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  border: `2px solid ${f.status === value ? color : "#e2e8f0"}`,
                  borderRadius: 8,
                  background: f.status === value ? bg : "#fff",
                  color: f.status === value ? color : "#94a3b8",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Note (optional)</label>
          <input
            value={f.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder={f.kind === "bill" ? "Due every 1st, average amount..." : "Family plan, annual renewal..."}
            className={s.input}
          />
        </div>

        <button
          onClick={() => {
            if (!f.name || !f.amount) return;
            onSave({
              ...f,
              amount: parseFloat(f.amount),
              icon: f.icon || SUB_CAT_ICONS[f.category] || "package",
              id: initial?.id || Date.now().toString(),
            });
          }}
          className={s.saveBtn}
        >
          {initial ? "Save Changes" : "Add Fixed Cost"}
        </button>
      </div>
    </div>
  );
}
