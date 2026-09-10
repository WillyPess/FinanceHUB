import { useState } from "react";
import { ASSET_CATEGORIES } from "../../constants.js";
import Icon from "../icons.jsx";
import s from "./Modal.module.css";

const STATUSES = [
  ["active", "Active"],
  ["maintenance", "Maint."],
  ["inactive", "Inactive"],
  ["sold", "Sold"],
];

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];

export default function AssetModal({ initial, onSave, onClose }) {
  const [f, setF] = useState({
    name: initial?.name || "",
    category: initial?.category || "",
    status: initial?.status || "active",
    incomeAmount: (initial?.incomeAmount ?? initial?.income_amount ?? "").toString(),
    incomeFrequency: initial?.incomeFrequency || initial?.income_frequency || "weekly",
    purchasePrice: (initial?.purchasePrice ?? initial?.purchase_price ?? "").toString(),
    purchaseDate: initial?.purchaseDate || initial?.purchase_date || "",
    note: initial?.note || "",
    id: initial?.id,
  });

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = () => {
    if (!f.name.trim()) return;
    onSave({
      ...f,
      name: f.name.trim(),
      category: f.category.trim() || null,
      incomeAmount: parseFloat(f.incomeAmount || 0),
      purchasePrice: f.purchasePrice === "" ? null : parseFloat(f.purchasePrice),
      id: initial?.id || Date.now().toString(),
    });
  };

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h3 className={s.title}>{initial ? "Edit Asset" : "New Asset"}</h3>
          <button onClick={onClose} className={s.close}><Icon name="close" size={13} /></button>
        </div>

        <div className={s.field}>
          <label className={s.label}>Name</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Corolla 2019, Unit 4/12 King St..." className={s.input} />
        </div>

        <div className={s.field}>
          <label className={s.label}>Category</label>
          <input
            value={f.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Vehicle, Property, Equipment..."
            list="asset-category-options"
            className={s.input}
          />
          <datalist id="asset-category-options">
            {ASSET_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className={s.field}>
          <label className={s.label}>Status</label>
          <div className={s.segmentRow}>
            {STATUSES.map(([value, label]) => (
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

        <div className={s.grid2} style={{ marginBottom: 14 }}>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Income Amount ($)</label>
            <input type="number" value={f.incomeAmount} onChange={(e) => set("incomeAmount", e.target.value)} placeholder="0.00" className={s.input} />
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Per</label>
            <select value={f.incomeFrequency} onChange={(e) => set("incomeFrequency", e.target.value)} className={s.input}>
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>{freq[0].toUpperCase() + freq.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={s.grid2} style={{ marginBottom: 14 }}>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Purchase Price ($)</label>
            <input type="number" value={f.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} placeholder="Optional" className={s.input} />
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Purchase Date</label>
            <input type="date" value={f.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} className={s.input} />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Note (optional)</label>
          <input
            value={f.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Anything asset-specific — tenant name, state rules, serial number..."
            className={s.input}
          />
        </div>

        <button onClick={submit} className={s.saveBtn}>
          {initial ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </div>
  );
}
