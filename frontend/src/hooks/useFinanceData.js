import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api.js";

export function useFinanceData() {
  const [transactions,  setTransactions]  = useState([]);
  const [debts,         setDebts]         = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Load all data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [txs, dbs, subs] = await Promise.all([
          api.transactions.list(),
          api.debts.list(),
          api.subscriptions.list(),
        ]);
        setTransactions(txs);
        setDebts(dbs);
        setSubscriptions(subs);
      } catch (e) {
        setError("Could not connect to backend. Make sure the server is running on port 3001.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Transactions ──
  const addTransaction = useCallback(async (body) => {
    const row = await api.transactions.create(body);
    setTransactions(p => [row, ...p]);
    return row;
  }, []);

  const updateTransaction = useCallback(async (id, body) => {
    const row = await api.transactions.update(id, body);
    setTransactions(p => p.map(t => t.id === id ? row : t));
    return row;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await api.transactions.remove(id);
    setTransactions(p => p.filter(t => t.id !== id));
  }, []);

  // ── Debts ──
  const addDebt = useCallback(async (body) => {
    const row = await api.debts.create(body);
    setDebts(p => [row, ...p]);
    return row;
  }, []);

  const updateDebt = useCallback(async (id, body) => {
    const row = await api.debts.update(id, body);
    setDebts(p => p.map(d => d.id === id ? row : d));
    return row;
  }, []);

  const deleteDebt = useCallback(async (id) => {
    await api.debts.remove(id);
    setDebts(p => p.filter(d => d.id !== id));
  }, []);

  // ── Subscriptions ──
  const addSubscription = useCallback(async (body) => {
    const row = await api.subscriptions.create(body);
    setSubscriptions(p => [row, ...p]);
    return row;
  }, []);

  const updateSubscription = useCallback(async (id, body) => {
    const row = await api.subscriptions.update(id, body);
    setSubscriptions(p => p.map(s => s.id === id ? row : s));
    return row;
  }, []);

  const deleteSubscription = useCallback(async (id) => {
    await api.subscriptions.remove(id);
    setSubscriptions(p => p.filter(s => s.id !== id));
  }, []);

  return {
    transactions, debts, subscriptions,
    loading, error,
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt, deleteDebt,
    addSubscription, updateSubscription, deleteSubscription,
  };
}
