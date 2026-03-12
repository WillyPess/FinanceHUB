import { useMemo, useState } from "react";
import { INVESTMENT_CATALOG, resolveIconGlyph } from "../../constants.js";
import { convertUsdToAud, fmtUsdFromAud } from "../../utils/formatters.js";
import s from "./Modal.module.css";

export default function InvestmentModal({ catalog, initialAsset, onSave, onClose }) {
  const options = catalog?.length ? catalog : INVESTMENT_CATALOG;
  const today = new Date().toISOString().slice(0, 10);
  const initialOption = useMemo(() => {
    if (initialAsset) {
      return options.find((item) => item.symbol === initialAsset.symbol) || initialAsset;
    }
    return null;
  }, [initialAsset, options]);

  const [step, setStep] = useState(initialAsset ? "form" : "select");
  const [selectedSymbol, setSelectedSymbol] = useState(initialOption?.symbol || "");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  const selectedAsset = options.find((item) => item.symbol === selectedSymbol) || initialOption;
  const canSave = selectedAsset && purchasePrice && quantity;

  const resetForm = () => {
    setPurchaseDate(today);
    setPurchasePrice("");
    setQuantity("");
    setNote("");
  };

  const save = async ({ keepOpen }) => {
    if (!canSave) return;
    const purchasePriceUsd = parseFloat(purchasePrice);
    const quantityValue = parseFloat(quantity);
    const purchasePriceAud = convertUsdToAud(purchasePriceUsd);

    const ok = await onSave({
      assetId: initialAsset?.id,
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      providerId: selectedAsset.providerId,
      marketType: selectedAsset.marketType,
      icon: selectedAsset.icon,
      purchaseDate,
      purchasePrice: purchasePriceAud,
      investedAmount: purchasePriceAud * quantityValue,
      quantity: quantityValue,
      note,
    });

    if (ok && keepOpen) {
      resetForm();
      return;
    }

    if (ok) {
      onClose();
    }
  };

  if (step === "select") {
    return (
      <div className={s.overlay}>
        <div className={s.modal} style={{ width: 520 }}>
          <div className={s.header}>
            <h3 className={s.title}>Select asset</h3>
            <button onClick={onClose} className={s.close}>x</button>
          </div>

          <div className={s.field}>
            <label className={s.label}>Asset</label>
            <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className={s.input}>
              <option value="">Choose one asset</option>
              {options.map((item) => (
                <option key={item.symbol} value={item.symbol}>
                  {item.symbol} - {item.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={s.saveBtn}
            onClick={() => {
              if (!selectedAsset) return;
              setStep("form");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.overlay}>
      <div className={s.modal} style={{ width: 560 }}>
        <div className={s.header}>
          <h3 className={s.title}>{initialAsset ? `Add to ${initialAsset.symbol}` : `Add to ${selectedAsset?.symbol || "Portfolio"}`}</h3>
          <button onClick={onClose} className={s.close}>x</button>
        </div>

        {selectedAsset && (
          <div
            style={{
              border: "1px solid #dbe3ea",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              background: "#fbfdff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  minWidth: 48,
                  height: 28,
                  border: "1px solid #1f2937",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                {selectedAsset.symbol}
              </span>
              <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>
                {selectedAsset.name} ({selectedAsset.symbol} / USD)
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {selectedAsset.currentPrice != null && (
                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                  {fmtUsdFromAud(selectedAsset.currentPrice)}
                </div>
              )}
              {selectedAsset.dayChangePct != null && (
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: selectedAsset.dayChangePct >= 0 ? "#ecfdf3" : "#fef2f2",
                    color: selectedAsset.dayChangePct >= 0 ? "#16a34a" : "#dc2626",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {selectedAsset.dayChangePct >= 0 ? "+" : ""}{selectedAsset.dayChangePct.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", gap: 14, alignItems: "end" }}>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Quantity</label>
            <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={s.input} placeholder="0.00693" />
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Purchase date</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={s.input} />
          </div>
          <div className={s.field} style={{ marginBottom: 0 }}>
            <label className={s.label}>Purchase price (USD)</label>
            <input type="number" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={s.input} placeholder="87120.00" />
          </div>
          {!initialAsset ? (
            <button
              type="button"
              onClick={() => {
                setStep("select");
                resetForm();
              }}
              style={{ height: 40, border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 18 }}
              title="Change asset"
            >
              ↺
            </button>
          ) : (
            <span />
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => resetForm()}
            style={{ border: "none", background: "transparent", color: "#2563eb", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            + More purchases of {selectedAsset?.symbol || "this asset"}
          </button>
        </div>

        <div className={s.field} style={{ marginTop: 12 }}>
          <label className={s.label}>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={s.input} placeholder="Optional note" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "12px 20px", border: "none", background: "transparent", color: "#2563eb", fontWeight: 700, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save({ keepOpen: true })}
            style={{ padding: "12px 18px", border: "none", borderRadius: 10, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Save and add another
          </button>
          <button
            type="button"
            onClick={() => save({ keepOpen: false })}
            style={{ padding: "12px 18px", border: "none", borderRadius: 10, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
