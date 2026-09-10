import { useState } from "react";
import { SUB_CATS, SUB_CAT_ICONS } from "../../constants.js";
import Icon from "../icons.jsx";
import s from "./Modal.module.css";

const ICON_OPTIONS = [...new Set(Object.values(SUB_CAT_ICONS))];

export default function SubModal({ initial, prefill, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  // `prefill` seeds a new recurring cost pre-linked to an asset without putting
  // the modal into edit mode.
  const seed = initial || prefill || {};
  const [f, setF] = useState({
    kind: seed.kind || "subscription",
    name: seed.name || "",
    icon: seed.icon || "tv",
    category: seed.category || "Streaming",
    amount: seed.amount?.toString() || "",
    frequency: seed.frequency || "monthly",
    nextBilling: seed.nextBilling || seed.next_billing || today,
    status: seed.status || "active",
    note: seed.note || "",
    assetId: seed.assetId || seed.asset_id || null,
    id: initial?.id,
  });

  const set = (key, value) => setF((prev) => ({ ...prev, [key]: value }));

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h3 className={s.title}>{initial ? "Edit Fixed Cost" : "New Fixed Cost"}</h3>
          <button onClick={onClose} className={s.close}><Icon name="close" size={13} /></button>
        </div>
        {(prefill?.assetName || f.assetId) && (
          <div className={s.field} style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 12 }}>
            Linked to {prefill?.assetName || "asset"}
          </div>
        )}

        <div className={s.field}>
          <label className={s.label}>Type</label>
          <div className={s.segmentRow}>
            {[["subscription", "Subscription"], ["bill", "Bill"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("kind", value)}
                className={`${s.segmentBtn} ${f.kind === value ? s.segmentBtnActive : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>{f.kind === "bill" ? "Bill Name" : "Name"}</label>
          <input
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={f.kind === "bill" ? "Rent, Electricity..." : "Netflix, Spotify..."}
            className={s.input}
          />
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

        <div className={s.field}>
          <label className={s.label}>Icon</label>
          <div className={s.iconGrid}>
            {ICON_OPTIONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => set("icon", iconName)}
                className={`${s.iconOption} ${f.icon === iconName ? s.iconOptionActive : ""}`}
                title={iconName}
              >
                <Icon name={iconName} size={16} />
              </button>
            ))}
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
          <div className={s.segmentRow}>
            {[["active", "Active"], ["paused", "Paused"], ["cancelled", "Cancelled"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("status", value)}
                className={`${s.segmentBtn} ${f.status === value ? s.segmentBtnActive : ""}`}
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
