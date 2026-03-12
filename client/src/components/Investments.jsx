import { useEffect, useMemo, useRef, useState } from "react";
import {
  fmt,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  fmtQuantity,
  fmtSignedCurrency,
  fmtSignedPercent,
  fmtUsdFromAud,
} from "../utils/formatters.js";
import { resolveIconGlyph } from "../constants.js";
import styles from "./Investments.module.css";

export default function Investments({ investments, apiHealth, onAdd, onAddPurchase, onDeletePurchase, onRefresh }) {
  const [expanded, setExpanded] = useState({});
  const [summaryPulse, setSummaryPulse] = useState({});
  const [assetPulse, setAssetPulse] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const portfolio = investments?.items || [];
  const summary = investments?.summary || {
    portfolioValue: 0,
    portfolioCost: 0,
    portfolioPl: 0,
    portfolioPlPct: null,
    dayMove: 0,
    assetCount: 0,
    lastUpdatedAt: null,
    marketStatus: { mode: "idle", message: "Waiting for quotes", nextRetryAt: null },
  };
  const prevSummaryRef = useRef(null);
  const prevAssetRef = useRef({});

  const rows = useMemo(() => portfolio, [portfolio]);

  useEffect(() => {
    const nextPulse = {};
    const prevSummary = prevSummaryRef.current;
    if (prevSummary) {
      if (prevSummary.portfolioValue !== summary.portfolioValue) nextPulse.portfolioValue = true;
      if (prevSummary.portfolioCost !== summary.portfolioCost) nextPulse.portfolioCost = true;
      if (prevSummary.portfolioPl !== summary.portfolioPl) nextPulse.portfolioPl = true;
      if (prevSummary.dayMove !== summary.dayMove) nextPulse.dayMove = true;
    }
    prevSummaryRef.current = {
      portfolioValue: summary.portfolioValue,
      portfolioCost: summary.portfolioCost,
      portfolioPl: summary.portfolioPl,
      dayMove: summary.dayMove,
    };
    if (Object.keys(nextPulse).length) {
      setSummaryPulse(nextPulse);
      const timer = setTimeout(() => setSummaryPulse({}), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [summary.dayMove, summary.portfolioCost, summary.portfolioPl, summary.portfolioValue]);

  useEffect(() => {
    const prevAssets = prevAssetRef.current;
    const nextPulse = {};
    rows.forEach((asset) => {
      const prev = prevAssets[asset.id];
      if (!prev) return;
      const changed =
        prev.currentPrice !== asset.currentPrice ||
        prev.value !== asset.value ||
        prev.dayGain !== asset.dayGain;
      if (changed) {
        nextPulse[asset.id] = true;
      }
    });

    prevAssetRef.current = Object.fromEntries(
      rows.map((asset) => [asset.id, {
        currentPrice: asset.currentPrice,
        value: asset.value,
        dayGain: asset.dayGain,
      }])
    );

    if (Object.keys(nextPulse).length) {
      setAssetPulse(nextPulse);
      const timer = setTimeout(() => setAssetPulse({}), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [rows]);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Investments</h1>
          <p className={styles.subtitle}>Portfolio rows follow Google Finance logic for price, quantity, day gain, day gain %, and value.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={handleRefresh} className={styles.refreshBtn} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh Prices"}
          </button>
          <button type="button" onClick={onAdd} className={styles.addBtn}>
            + Add Investment
          </button>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Portfolio Value" value={fmt(summary.portfolioValue || 0)} tone="blue" pulse={summaryPulse.portfolioValue} />
        <SummaryCard label="Total Invested" value={fmt(summary.portfolioCost || 0)} tone="slate" pulse={summaryPulse.portfolioCost} />
        <SummaryCard
          label="Total P/L"
          value={`${fmt(summary.portfolioPl || 0)}${summary.portfolioPlPct == null ? "" : ` (${fmtSignedPercent(summary.portfolioPlPct)})`}`}
          tone={summary.portfolioPl >= 0 ? "green" : "red"}
          pulse={summaryPulse.portfolioPl}
        />
        <SummaryCard
          label="Day Move"
          value={summary.dayMove == null ? "-" : fmtSignedCurrency(summary.dayMove)}
          tone={(summary.dayMove || 0) >= 0 ? "green" : "red"}
          pulse={summaryPulse.dayMove}
        />
      </div>

      <div className={styles.metaBar}>
        <span>{summary.assetCount || 0} assets tracked</span>
        <span>Price cache refresh every 45s</span>
        <span className={`${styles.statusBadge} ${styles[summary.marketStatus?.mode || "idle"]}`}>
          {summary.marketStatus?.message || "Waiting for quotes"}
        </span>
        <span>{summary.lastUpdatedAt ? `Updated ${fmtDate(summary.lastUpdatedAt.slice(0, 10))}` : "Waiting for quotes"}</span>
      </div>

      <section className={styles.diagnosticCard}>
        <div className={styles.diagnosticTitle}>Connection Diagnostics</div>
        <div className={styles.diagnosticGrid}>
          <DiagnosticItem label="Local API" value={apiHealth?.ok ? "Online" : "Offline"} tone={apiHealth?.ok ? "live" : "fallback"} />
          <DiagnosticItem
            label="Market Data"
            value={
              summary.marketStatus?.mode === "live"
                ? "Live"
                : summary.marketStatus?.mode === "rate_limited"
                  ? "Rate limited"
                  : summary.marketStatus?.mode === "locked"
                    ? "Manual snapshot"
                    : "Fallback"
            }
            tone={summary.marketStatus?.mode || "idle"}
          />
          <DiagnosticItem label="Retry At" value={summary.marketStatus?.nextRetryAt ? formatDateTime(summary.marketStatus.nextRetryAt) : "-"} />
          <DiagnosticItem label="DB File" value={apiHealth?.dbPath || "-"} compact />
        </div>
      </section>

      <div className={styles.list}>
        {rows.map((asset) => {
          const isOpen = expanded[asset.id] ?? true;
          return (
            <article key={asset.id} className={`${styles.assetCard} ${assetPulse[asset.id] ? styles.assetPulse : ""}`}>
              <button
                type="button"
                className={styles.assetHeader}
                onClick={() => setExpanded((prev) => ({ ...prev, [asset.id]: !isOpen }))}
              >
                <div className={styles.assetMain}>
                  <span className={styles.assetIcon}>{resolveIconGlyph(asset.icon)}</span>
                  <div>
                    <div className={styles.assetTop}>
                      <span className={styles.symbol}>{asset.symbol}</span>
                      <span className={styles.assetName}>{asset.name} ({asset.symbol} / USD)</span>
                    </div>
                  </div>
                </div>

                <div className={styles.assetMetrics}>
                  <Metric label="Price" value={formatMaybeCurrency(asset.price)} pulse={assetPulse[asset.id]} />
                  <Metric label="Quantity" value={fmtQuantity(asset.quantity)} />
                  <Metric
                    label="Day Gain"
                    value={formatMaybeSignedCurrency(asset.dayGain)}
                    tone={getTone(asset.dayGain)}
                    pulse={assetPulse[asset.id]}
                  />
                  <Metric
                    label="Day Gain %"
                    value={formatMaybeSignedPercent(asset.dayGainPct)}
                    tone={getTone(asset.dayGainPct)}
                    tag={asset.dayGainPct == null ? null : formatDirectionTag(asset.dayGainPct)}
                  />
                  <Metric label="Value" value={formatMaybeCurrency(asset.value)} pulse={assetPulse[asset.id]} />
                </div>
              </button>

              {isOpen && (
                <div className={styles.assetBody}>
                  <div className={styles.lotHead}>
                    <span>Purchase Date</span>
                    <span>Purchase Price (USD)</span>
                    <span>Quantity</span>
                    <span>Total Gain</span>
                    <span>Total Gain %</span>
                    <span>Value</span>
                    <span />
                  </div>

                  {asset.transactions.map((transaction) => (
                    <div key={transaction.id} className={styles.lotRow}>
                      <DataCell label="Purchase Date" value={fmtDate(transaction.purchaseDate)} />
                      <DataCell label="Purchase Price" value={fmtUsdFromAud(transaction.purchasePrice)} />
                      <DataCell label="Quantity" value={fmtQuantity(transaction.quantity)} />
                      <DataCell
                        label="Total Gain"
                        value={formatMaybeSignedCurrency(transaction.totalGain)}
                        tone={getTone(transaction.totalGain)}
                      />
                      <DataCell
                        label="Total Gain %"
                        value={formatMaybeSignedPercent(transaction.totalGainPct)}
                        tone={getTone(transaction.totalGainPct)}
                      />
                      <DataCell label="Value" value={formatMaybeCurrency(transaction.value)} />
                      <button type="button" className={styles.deleteBtn} onClick={() => onDeletePurchase(transaction.id)}>
                        Del
                      </button>
                    </div>
                  ))}

                  <button type="button" className={styles.recordBtn} onClick={() => onAddPurchase(asset)}>
                    + Record another purchase
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {rows.length === 0 && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No investments yet</div>
            <p className={styles.emptyText}>Add your first crypto purchase to start tracking live price, day gain, and per-transaction performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, pulse }) {
  return (
    <div className={`${styles.summaryCard} ${styles[tone]} ${pulse ? styles.valuePulse : ""}`}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  );
}

function Metric({ label, value, tone, tag, pulse }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${tone ? styles[tone] : ""} ${pulse ? styles.valuePulseText : ""}`}>{value}</span>
      {tag && <span className={`${styles.metricTag} ${tone ? styles[tone] : ""}`}>{tag}</span>}
    </div>
  );
}

function DataCell({ label, value, tone }) {
  return (
    <span className={`${styles.dataCell} ${tone ? styles[tone] : ""}`} data-label={label}>
      {value}
    </span>
  );
}

function DiagnosticItem({ label, value, tone, compact = false }) {
  return (
    <div className={styles.diagnosticItem}>
      <span className={styles.diagnosticLabel}>{label}</span>
      <span className={`${styles.diagnosticValue} ${compact ? styles.compactValue : ""} ${tone ? styles[tone] : ""}`}>{value}</span>
    </div>
  );
}

function formatMaybeCurrency(value) {
  return value == null ? "..." : fmtCurrency(value);
}

function formatMaybeSignedCurrency(value) {
  return value == null ? "..." : fmtSignedCurrency(value);
}

function formatMaybeSignedPercent(value) {
  return value == null ? "..." : fmtSignedPercent(value);
}

function formatDirectionTag(value) {
  return `${value >= 0 ? "Up" : "Down"} ${fmtPercent(Math.abs(value))}`;
}

function getTone(value) {
  if (value == null) return null;
  return value >= 0 ? "positive" : "negative";
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
