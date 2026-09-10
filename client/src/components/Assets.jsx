import { useEffect, useMemo, useState } from "react";
import { fmt, fmtDate } from "../utils/formatters.js";
import * as api from "../utils/api.js";
import Icon from "./icons.jsx";
import styles from "./Assets.module.css";

const STATUS_LABEL = { active: "Active", maintenance: "Maintenance", inactive: "Inactive", sold: "Sold" };
const FREQ_SUFFIX = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

const incomeRate = (asset) =>
  `${fmt(asset.incomeAmount || 0)} / ${FREQ_SUFFIX[asset.incomeFrequency] || "week"}`;

const renewalBadgeText = (renewal) => {
  if (!renewal || !renewal.status || renewal.status === "ok") return null;
  if (renewal.status === "overdue") return `${renewal.label} overdue`;
  return `${renewal.label} due ${renewal.days}d`;
};

export default function Assets({
  assets,
  onAdd,
  onEdit,
  onDelete,
  onLogIncome,
  onLogExpense,
  onAddRecurring,
  onAddRenewal,
  onUpdateRenewal,
  onDeleteRenewal,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const selected = useMemo(() => assets.find((a) => a.id === selectedId) || null, [assets, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setDetailError(null);
    api
      .getAsset(selectedId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch(() => { if (!cancelled) setDetailError("Could not load this asset's history."); });
    return () => { cancelled = true; };
  }, [selectedId, assets]);

  const activeAssets = assets.filter((a) => a.status === "active");
  const weeklyIncome = activeAssets.reduce((sum, a) => sum + (a.stats?.weeklyEquivalentIncome || 0), 0);
  const totalNet = assets.reduce((sum, a) => sum + (a.stats?.netProfit || 0), 0);

  if (selected) {
    return (
      <AssetDetail
        asset={selected}
        detail={detail}
        detailError={detailError}
        onBack={() => setSelectedId(null)}
        onEdit={onEdit}
        onDelete={(id) => { onDelete(id); setSelectedId(null); }}
        onLogIncome={onLogIncome}
        onLogExpense={onLogExpense}
        onAddRecurring={onAddRecurring}
        onAddRenewal={onAddRenewal}
        onUpdateRenewal={onUpdateRenewal}
        onDeleteRenewal={onDeleteRenewal}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assets</h1>
          <p className={styles.subtitle}>Income against running costs, per asset</p>
        </div>
        <button type="button" onClick={onAdd} className={styles.addBtn}>+ Add Asset</button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Assets</div>
          <div className={`${styles.summaryValue} ledgerTotal`}>{assets.length}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Income / week (active)</div>
          <div className={`${styles.summaryValue} ledgerTotal`} style={{ color: "var(--positive)" }}>{fmt(weeklyIncome)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Net profit (lifetime)</div>
          <div className={`${styles.summaryValue} ledgerTotal`} style={{ color: totalNet >= 0 ? "var(--positive)" : "var(--negative)" }}>
            {fmt(totalNet)}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {assets.map((asset) => {
          const badge = renewalBadgeText(asset.nextRenewal);
          const net = asset.stats?.netProfit || 0;
          return (
            <article
              key={asset.id}
              className={styles.card}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(asset.id)}
              onKeyDown={(e) => { if (e.key === "Enter") setSelectedId(asset.id); }}
            >
              <div className={styles.chips}>
                <span className={`${styles.chip} ${styles[asset.status] || ""}`}>{STATUS_LABEL[asset.status] || asset.status}</span>
                {asset.category && <span className={styles.chipMuted}>{asset.category}</span>}
              </div>

              <div className={styles.cardTop}>
                <div className={styles.assetIcon}><Icon name="package" size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <h3 className={styles.assetName}>{asset.name}</h3>
                  <p className={styles.assetSub}>{incomeRate(asset)}</p>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <span className={styles.metaLabel}>Weekly equiv.</span>
                  <span className={styles.metaValue}>{fmt(asset.stats?.weeklyEquivalentIncome || 0)}</span>
                </div>
                <div>
                  <span className={styles.metaLabel}>Weekly net</span>
                  <span className={styles.metaValue}>{fmt(asset.stats?.estWeeklyNet || 0)}</span>
                </div>
                <div>
                  <span className={styles.metaLabel}>Net profit</span>
                  <span className={styles.metaValue} style={{ color: net >= 0 ? "var(--positive)" : "var(--negative)" }}>{fmt(net)}</span>
                </div>
              </div>

              {badge && (
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${asset.nextRenewal.status === "overdue" ? styles.badgeOverdue : styles.badgeSoon}`}>
                    <Icon name="bell" size={12} /> {badge}
                  </span>
                </div>
              )}
            </article>
          );
        })}

        {assets.length === 0 && <div className={styles.empty}>No assets yet — add your first one.</div>}
      </div>
    </div>
  );
}

function AssetDetail({
  asset,
  detail,
  detailError,
  onBack,
  onEdit,
  onDelete,
  onLogIncome,
  onLogExpense,
  onAddRecurring,
  onAddRenewal,
  onUpdateRenewal,
  onDeleteRenewal,
}) {
  const stats = asset.stats || {};
  const renewals = detail?.renewals || [];
  const txs = detail?.transactions || [];
  const subs = detail?.subscriptions || [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button type="button" onClick={onBack} className={styles.backBtn}>&larr; Assets</button>
          <h1 className={styles.title}>{asset.name}</h1>
          <p className={styles.subtitle}>
            {asset.category || "Uncategorised"} &middot; {STATUS_LABEL[asset.status] || asset.status} &middot; {incomeRate(asset)}
          </p>
        </div>
        <div className={styles.detailActions}>
          <button type="button" onClick={() => onEdit(asset)} className={styles.secondaryBtn}>Edit</button>
          <button type="button" onClick={() => onDelete(asset.id)} className={styles.dangerBtn}>Delete</button>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total received</div>
          <div className={`${styles.summaryValue} ledgerTotal`} style={{ color: "var(--positive)" }}>{fmt(stats.totalReceived || 0)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total spent</div>
          <div className={`${styles.summaryValue} ledgerTotal`}>{fmt(stats.totalSpent || 0)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Weekly equiv. income</div>
          <div className={`${styles.summaryValue} ledgerTotal`}>{fmt(stats.weeklyEquivalentIncome || 0)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Net profit</div>
          <div className={`${styles.summaryValue} ledgerTotal`} style={{ color: (stats.netProfit || 0) >= 0 ? "var(--positive)" : "var(--negative)" }}>
            {fmt(stats.netProfit || 0)}
          </div>
        </div>
      </div>

      <div className={styles.quickRow}>
        <button type="button" className={styles.quickBtn} onClick={() => onLogIncome(asset)}>
          <Icon name="salary" size={15} /> Log income received
        </button>
        <button type="button" className={styles.quickBtn} onClick={() => onLogExpense(asset)}>
          <Icon name="receipt" size={15} /> Log expense
        </button>
        <button type="button" className={styles.quickBtn} onClick={() => onAddRecurring(asset)}>
          <Icon name="repeat" size={15} /> Add recurring cost
        </button>
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Renewals &amp; reminders</h3>
          <Renewals
            assetId={asset.id}
            renewals={renewals}
            detailError={detailError}
            onAdd={onAddRenewal}
            onUpdate={onUpdateRenewal}
            onDelete={onDeleteRenewal}
          />
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Details</h3>
          <DetailRow label="Income rate" value={incomeRate(asset)} />
          <DetailRow label="Weekly recurring cost" value={fmt(stats.weeklyRecurringCost || 0)} />
          <DetailRow label="Est. weekly net" value={fmt(stats.estWeeklyNet || 0)} />
          <DetailRow label="Purchase price" value={asset.purchasePrice != null ? fmt(asset.purchasePrice) : "-"} />
          <DetailRow label="Purchase date" value={fmtDate(asset.purchaseDate)} />
          {asset.note && <DetailRow label="Note" value={asset.note} />}
        </section>
      </div>

      <section className={styles.card} style={{ marginTop: 14 }}>
        <h3 className={styles.cardTitle}>Recurring costs</h3>
        {detailError && <p className={styles.empty}>{detailError}</p>}
        {!detailError && subs.length === 0 && <p className={styles.empty}>No recurring costs linked.</p>}
        {subs.map((sub) => (
          <div key={sub.id} className={styles.lineRow}>
            <span className={styles.lineIcon}><Icon name={sub.icon || "repeat"} size={15} /></span>
            <div className={styles.lineInfo}>
              <div className={styles.lineName}>{sub.name}</div>
              <div className={styles.lineMeta}>{sub.category} &middot; {sub.frequency} &middot; {sub.status}</div>
            </div>
            <div className={styles.lineAmt}>{fmt(sub.amount)}</div>
          </div>
        ))}
      </section>

      <section className={styles.card} style={{ marginTop: 14 }}>
        <h3 className={styles.cardTitle}>Linked transactions</h3>
        {detailError && <p className={styles.empty}>{detailError}</p>}
        {!detailError && txs.length === 0 && <p className={styles.empty}>No transactions linked yet.</p>}
        {txs.map((tx) => (
          <div key={tx.id} className={styles.lineRow}>
            <span className={styles.lineIcon}><Icon name={tx.icon || "package"} size={15} /></span>
            <div className={styles.lineInfo}>
              <div className={styles.lineName}>{tx.desc || tx.description}</div>
              <div className={styles.lineMeta}>{fmtDate(tx.date)} &middot; {tx.category}</div>
            </div>
            <div className={tx.type === "income" ? styles.lineAmtPos : styles.lineAmt}>
              {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const BLANK_RENEWAL = { label: "", dueDate: "", note: "" };

function Renewals({ assetId, renewals, detailError, onAdd, onUpdate, onDelete }) {
  const [draft, setDraft] = useState(BLANK_RENEWAL);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(BLANK_RENEWAL);

  const setD = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));
  const setE = (k, v) => setEditDraft((prev) => ({ ...prev, [k]: v }));

  const submitNew = () => {
    if (!draft.label.trim()) return;
    onAdd(assetId, { ...draft, label: draft.label.trim() });
    setDraft(BLANK_RENEWAL);
  };

  const startEdit = (renewal) => {
    setEditingId(renewal.id);
    setEditDraft({ label: renewal.label, dueDate: renewal.dueDate || "", note: renewal.note || "" });
  };

  const submitEdit = () => {
    if (!editDraft.label.trim()) return;
    onUpdate(assetId, editingId, { ...editDraft, label: editDraft.label.trim() });
    setEditingId(null);
  };

  return (
    <div>
      {detailError && <p className={styles.empty}>{detailError}</p>}
      {!detailError && renewals.length === 0 && <p className={styles.empty}>No renewals yet — add one below.</p>}

      {renewals.map((renewal) =>
        editingId === renewal.id ? (
          <div key={renewal.id} className={styles.renewalForm}>
            <input className={styles.renewalInput} value={editDraft.label} onChange={(e) => setE("label", e.target.value)} placeholder="Label" />
            <input className={styles.renewalDate} type="date" value={editDraft.dueDate} onChange={(e) => setE("dueDate", e.target.value)} />
            <input className={styles.renewalInput} value={editDraft.note} onChange={(e) => setE("note", e.target.value)} placeholder="Note (optional)" />
            <div className={styles.renewalActions}>
              <button type="button" className={styles.renewalSave} onClick={submitEdit}>Save</button>
              <button type="button" className={styles.renewalCancel} onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div key={renewal.id} className={styles.renewalRow}>
            <span
              className={`${styles.renewalDot} ${
                renewal.status === "overdue" ? styles.dotOverdue : renewal.status === "soon" ? styles.dotSoon : styles.dotOk
              }`}
            />
            <div className={styles.lineInfo}>
              <div className={styles.lineName}>{renewal.label}</div>
              <div className={styles.lineMeta}>
                {renewal.dueDate ? fmtDate(renewal.dueDate) : "No date"}
                {renewal.status === "overdue" && ` · overdue`}
                {renewal.status === "soon" && ` · ${renewal.days}d`}
                {renewal.note ? ` · ${renewal.note}` : ""}
              </div>
            </div>
            <button type="button" className={styles.renewalIconBtn} onClick={() => startEdit(renewal)}>Edit</button>
            <button type="button" className={styles.renewalIconBtn} onClick={() => onDelete(assetId, renewal.id)}>Del</button>
          </div>
        )
      )}

      <div className={styles.renewalForm}>
        <input className={styles.renewalInput} value={draft.label} onChange={(e) => setD("label", e.target.value)} placeholder="Roadworthy, Insurance, Rates..." />
        <input className={styles.renewalDate} type="date" value={draft.dueDate} onChange={(e) => setD("dueDate", e.target.value)} />
        <input className={styles.renewalInput} value={draft.note} onChange={(e) => setD("note", e.target.value)} placeholder="Note (optional)" />
        <div className={styles.renewalActions}>
          <button type="button" className={styles.renewalSave} onClick={submitNew}>Add</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}
