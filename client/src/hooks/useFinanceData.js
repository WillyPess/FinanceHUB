import { useState, useEffect, useCallback } from "react";
import * as api from "../utils/api.js";

export function useFinanceData() {
  const [transactions,  setTransactions]  = useState([]);
  const [debts,         setDebts]         = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, dbs, subs] = await Promise.all([
        api.getTx(), api.getDebts(), api.getSubs(),
      ]);
      setTransactions(txs);
      setDebts(dbs);
      setSubscriptions(subs);
      setError(null);
    } catch (e) {
      setError("Cannot connect to server. Make sure the backend is running on port 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Transactions ──
  const addTransaction = async (tx) => {
    await api.addTx(tx);
    setTransactions(p => [tx, ...p]);
  };
  const updateTransaction = async (tx) => {
    await api.updateTx(tx.id, tx);
    setTransactions(p => p.map(t => t.id === tx.id ? tx : t));
  };
  const deleteTransaction = async (id) => {
    await api.deleteTx(id);
    setTransactions(p => p.filter(t => t.id !== id));
  };

  // ── Debts ──
  const addDebt = async (d) => {
    await api.addDebt(d);
    setDebts(p => [d, ...p]);
  };
  const updateDebt = async (d) => {
    await api.updateDebt(d.id, d);
    setDebts(p => p.map(x => x.id === d.id ? d : x));
  };
  const deleteDebt = async (id) => {
    await api.deleteDebt(id);
    setDebts(p => p.filter(x => x.id !== id));
  };

  // ── Subscriptions ──
  const addSubscription = async (s) => {
    await api.addSub(s);
    setSubscriptions(p => [s, ...p]);
  };
  const updateSubscription = async (s) => {
    await api.updateSub(s.id, s);
    setSubscriptions(p => p.map(x => x.id === s.id ? s : x));
  };
  const deleteSubscription = async (id) => {
    await api.deleteSub(id);
    setSubscriptions(p => p.filter(x => x.id !== id));
  };

  return {
    data: { transactions, debts, subscriptions, user: { name: "Willy Pessoa", email: "willypessoa12@gmail.com" } },
    loading, error,
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt, deleteDebt,
    addSubscription, updateSubscription, deleteSubscription,
  };
}
