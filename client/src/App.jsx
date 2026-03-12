import { useEffect, useState } from "react";
import { useFinanceData } from "./hooks/useFinanceData.js";
import { getDisplayCurrency, getDisplayCurrencyOptions, setDisplayCurrency as setDisplayCurrencyPreference } from "./utils/formatters.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Transactions from "./components/Transactions.jsx";
import Investments from "./components/Investments.jsx";
import Subscriptions from "./components/Subscriptions.jsx";
import Debts from "./components/Debts.jsx";
import TxModal from "./components/modals/TxModal.jsx";
import DebtModal from "./components/modals/DebtModal.jsx";
import SubModal from "./components/modals/SubModal.jsx";
import InvestmentModal from "./components/modals/InvestmentModal.jsx";

export default function App() {
  const {
    data,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addDebt,
    updateDebt,
    deleteDebt,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addInvestmentPurchase,
    deleteInvestmentPurchase,
    setInvestmentRange,
    refreshInvestments,
  } = useFinanceData();

  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saveNotice, setSaveNotice] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState(getDisplayCurrency());

  useEffect(() => {
    if (!saveNotice) return undefined;
    const timer = setTimeout(() => setSaveNotice(null), 2200);
    return () => clearTimeout(timer);
  }, [saveNotice]);

  const showSaved = (message = "Saved to database") => {
    setSaveNotice({ type: "success", message });
  };

  const showSaveError = (message = "Could not save to database") => {
    setSaveNotice({ type: "error", message });
  };

  const runSavedAction = async (action, successMessage) => {
    try {
      await action();
      showSaved(successMessage);
      return true;
    } catch (err) {
      showSaveError();
      return false;
    }
  };

  const handleDeleteTransaction = async (id) => {
    await runSavedAction(() => deleteTransaction(id), "Transaction removed from database");
  };

  const handleDeleteDebt = async (id) => {
    await runSavedAction(() => deleteDebt(id), "Debt removed from database");
  };

  const handleDeleteSubscription = async (id) => {
    await runSavedAction(() => deleteSubscription(id), "Fixed cost removed from database");
  };

  const handleDeleteInvestmentPurchase = async (id) => {
    await runSavedAction(() => deleteInvestmentPurchase(id), "Investment purchase removed from database");
  };

  const openEditTx = (tx) => {
    setEditing(tx);
    setModal("edit-tx");
  };

  const openEditDebt = (debt) => {
    setEditing(debt);
    setModal("edit-debt");
  };

  const openEditSub = (item) => {
    setEditing(item);
    setModal("edit-sub");
  };

  const openAddInvestment = (asset = null) => {
    setEditing(asset);
    setModal("add-investment");
  };

  const handleDisplayCurrencyChange = (event) => {
    const nextCurrency = event.target.value;
    setDisplayCurrencyPreference(nextCurrency);
    setDisplayCurrency(nextCurrency);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 32 }}>$</div>
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading FinanceHub...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16, padding: 32 }}>
        <div style={{ fontSize: 40 }}>!</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>Cannot connect to server</div>
        <div style={{ color: "#64748b", fontSize: 14, textAlign: "center", maxWidth: 400 }}>{error}</div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#374151", fontFamily: "monospace" }}>
          Make sure you ran: <b>npm run dev</b> from the project root
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "18px", background: "#edf1ed" }}>
      <div style={{ display: "flex", minHeight: "calc(100vh - 36px)", background: "#f7f9f7", border: "1px solid #d7dfd7", borderRadius: "24px", overflow: "hidden", boxShadow: "0 8px 24px rgba(16,24,40,0.05)" }}>
        <Sidebar page={page} setPage={setPage} user={data.user} />
        <main style={{ flex: 1, overflowY: "auto", background: "#fcfdfc" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 10,
              padding: "18px 24px 0",
            }}
          >
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#64748b", textTransform: "uppercase" }}>
              Display Currency
            </label>
            <select
              value={displayCurrency}
              onChange={handleDisplayCurrencyChange}
              style={{
                border: "1px solid #d7dfd7",
                borderRadius: 10,
                padding: "10px 12px",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              {getDisplayCurrencyOptions().map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>
                  {currencyCode}
                </option>
              ))}
            </select>
          </div>
          {page === "dashboard" && (
            <Dashboard
              data={data}
              onEditTx={openEditTx}
              onDeleteTx={handleDeleteTransaction}
              onChangeInvestmentRange={setInvestmentRange}
            />
          )}
          {page === "transactions" && (
            <Transactions
              transactions={data.transactions}
              onAdd={() => {
                setEditing(null);
                setModal("add-tx");
              }}
              onEdit={openEditTx}
              onDelete={handleDeleteTransaction}
            />
          )}
          {page === "investments" && (
            <Investments
              investments={data.investments}
              apiHealth={data.apiHealth}
              catalog={data.investmentCatalog}
              onAdd={() => openAddInvestment(null)}
              onAddPurchase={openAddInvestment}
              onDeletePurchase={handleDeleteInvestmentPurchase}
              onRefresh={refreshInvestments}
            />
          )}
          {page === "fixed-costs" && (
            <Subscriptions
              subscriptions={data.subscriptions}
              onAdd={() => {
                setEditing(null);
                setModal("add-sub");
              }}
              onEdit={openEditSub}
              onDelete={handleDeleteSubscription}
            />
          )}
          {page === "debts" && (
            <Debts
              debts={data.debts}
              onAdd={() => {
                setEditing(null);
                setModal("add-debt");
              }}
              onEdit={openEditDebt}
              onDelete={handleDeleteDebt}
            />
          )}
        </main>
      </div>

      {saveNotice && (
        <div
          style={{
            position: "fixed",
            right: 28,
            bottom: 28,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 14,
            border: `1px solid ${saveNotice.type === "success" ? "#b7ebc6" : "#f3c1c1"}`,
            background: saveNotice.type === "success" ? "#edf9f0" : "#fff1f1",
            color: saveNotice.type === "success" ? "#166534" : "#b42318",
            boxShadow: "0 10px 24px rgba(16,24,40,0.12)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span>{saveNotice.type === "success" ? "DB" : "!"}</span>
          <span>{saveNotice.message}</span>
        </div>
      )}

      {(modal === "add-tx" || modal === "edit-tx") && (
        <TxModal
          initial={modal === "edit-tx" ? editing : null}
          onSave={async (tx) => {
            const ok = await runSavedAction(
              () => (modal === "edit-tx" ? updateTransaction(tx) : addTransaction(tx)),
              modal === "edit-tx" ? "Transaction saved to database" : "Transaction added to database"
            );
            if (ok) setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {(modal === "add-debt" || modal === "edit-debt") && (
        <DebtModal
          initial={modal === "edit-debt" ? editing : null}
          onSave={async (debt) => {
            const ok = await runSavedAction(
              () => (modal === "edit-debt" ? updateDebt(debt) : addDebt(debt)),
              modal === "edit-debt" ? "Debt saved to database" : "Debt added to database"
            );
            if (ok) setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {(modal === "add-sub" || modal === "edit-sub") && (
        <SubModal
          initial={modal === "edit-sub" ? editing : null}
          onSave={async (item) => {
            const ok = await runSavedAction(
              () => (modal === "edit-sub" ? updateSubscription(item) : addSubscription(item)),
              modal === "edit-sub" ? "Fixed cost saved to database" : "Fixed cost added to database"
            );
            if (ok) setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "add-investment" && (
        <InvestmentModal
          catalog={data.investmentCatalog}
          initialAsset={editing}
          onSave={async (item) => {
            return await runSavedAction(
              () => addInvestmentPurchase(item),
              editing ? "Investment purchase saved to database" : "Investment added to database"
            );
          }}
          onClose={() => {
            setEditing(null);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
