import { useMemo, useState } from "react";
import { INVESTMENT_CATALOG, resolveIconGlyph } from "../../constants.js";
import { convertUsdToAud, fmtUsdFromAud } from "../../utils/formatters.js";
import Icon from "../icons.jsx";
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
            <button onClick={onClose} className={s.close}><Icon name="close" size={13} /></button>
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
          <button onClick={onClose} className={s.close}><Icon name="close" size={13} /></button>
        </div>

        {selectedAsset && (
          <div className={s.assetPreview}>
            <div className={s.assetPreviewLeft}>
              <span className={s.tickerBadge}>{resolveIconGlyph(selectedAsset.icon)}</span>
              <div className={s.assetPreviewName}>{selectedAsset.name} ({selectedAsset.symbol} / USD)</div>
            </div>
            <div className={s.assetPreviewRight}>
              {selectedAsset.currentPrice != null && (
                <div className={s.assetPrice}>{fmtUsdFromAud(selectedAsset.currentPrice)}</div>
              )}
              {selectedAsset.dayChangePct != null && (
                <div className={`${s.changeTag} ${selectedAsset.dayChangePct >= 0 ? s.positive : s.negative}`}>
                  {selectedAsset.dayChangePct >= 0 ? "+" : ""}{selectedAsset.dayChangePct.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: initialAsset ? "1fr 1fr 1fr" : "1fr 1fr 1fr 34px", gap: 14, alignItems: "end" }}>
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
          {!initialAsset && (
            <button
              type="button"
              onClick={() => {
                setStep("select");
                resetForm();
              }}
              className={s.textBtn}
              style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Change asset"
            >
              <Icon name="refresh" size={15} />
            </button>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => resetForm()} className={s.ghostBtn}>
            + More purchases of {selectedAsset?.symbol || "this asset"}
          </button>
        </div>

        <div className={s.field} style={{ marginTop: 12 }}>
          <label className={s.label}>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={s.input} placeholder="Optional note" />
        </div>

        <div className={s.actionsRow}>
          <button type="button" onClick={onClose} className={s.secondaryBtn}>Cancel</button>
          <button type="button" onClick={() => save({ keepOpen: true })} className={s.secondaryBtn}>Save and add another</button>
          <button type="button" onClick={() => save({ keepOpen: false })} className={s.primaryBtn}>Save</button>
        </div>
      </div>
    </div>
  );
}
