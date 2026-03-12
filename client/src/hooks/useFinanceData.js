import { useState, useEffect, useCallback } from "react";
import * as api from "../utils/api.js";

const normalizeDebt = (debt) => ({ ...debt, dueDate: debt?.dueDate || debt?.due_date });
const normalizeSubscription = (item) => ({ ...item, nextBilling: item?.nextBilling || item?.next_billing });

export function useFinanceData() {
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, dbs, subs] = await Promise.all([api.getTx(), api.getDebts(), api.getSubs()]);
      setTransactions(txs);
      setDebts(dbs.map(normalizeDebt));
      setSubscriptions(subs.map(normalizeSubscription));
      setError(null);
    } catch (e) {
      setError("Cannot connect to server. Make sure the backend is running on port 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addTransaction = async (tx) => {
    await api.addTx(tx);
    await loadAll();
  };

  const updateTransaction = async (tx) => {
    await api.updateTx(tx.id, tx);
    await loadAll();
  };

  const deleteTransaction = async (id) => {
    await api.deleteTx(id);
    await loadAll();
  };

  const addDebt = async (debt) => {
    await api.addDebt(debt);
    await loadAll();
  };

  const updateDebt = async (debt) => {
    await api.updateDebt(debt.id, debt);
    await loadAll();
  };

  const deleteDebt = async (id) => {
    await api.deleteDebt(id);
    await loadAll();
  };

  const addSubscription = async (item) => {
    await api.addSub(item);
    await loadAll();
  };

  const updateSubscription = async (item) => {
    await api.updateSub(item.id, item);
    await loadAll();
  };

  const deleteSubscription = async (id) => {
    await api.deleteSub(id);
    await loadAll();
  };

  return {
    data: {
      transactions,
      debts,
      subscriptions,
      user: { name: "Willy Pessoa", email: "willypessoa12@gmail.com" },
    },
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
  };
}
