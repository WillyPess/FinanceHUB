import { useState, useEffect, useCallback } from "react";
import * as api from "../utils/api.js";

const normalizeDebt = (debt) => ({ ...debt, dueDate: debt?.dueDate || debt?.due_date });
const normalizeSubscription = (item) => ({ ...item, nextBilling: item?.nextBilling || item?.next_billing });
const DEFAULT_INVESTMENT_RANGE = "1M";

export function useFinanceData() {
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [investments, setInvestments] = useState({ items: [], summary: null });
  const [investmentTrend, setInvestmentTrend] = useState([]);
  const [investmentRange, setInvestmentRange] = useState(DEFAULT_INVESTMENT_RANGE);
  const [investmentCatalog, setInvestmentCatalog] = useState([]);
  const [apiHealth, setApiHealth] = useState({ ok: false, dbPath: null, investmentRefreshMs: null, priceCacheRefreshMs: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInvestmentQuotes = useCallback(async () => {
    const portfolio = await api.getInvestments();
    setInvestments(portfolio);
  }, []);

  const loadInvestmentTrend = useCallback(async (range = DEFAULT_INVESTMENT_RANGE) => {
    const trend = await api.getInvestmentsTrend(range);
    setInvestmentTrend(trend);
  }, []);

  const loadInvestmentCatalog = useCallback(async () => {
    const catalog = await api.getInvestmentCatalog();
    setInvestmentCatalog(catalog);
  }, []);

  const loadHealth = useCallback(async () => {
    const health = await api.getHealth();
    setApiHealth(health);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, dbs, subs, portfolio, trend, catalog, health] = await Promise.all([
        api.getTx(),
        api.getDebts(),
        api.getSubs(),
        api.getInvestments(),
        api.getInvestmentsTrend(DEFAULT_INVESTMENT_RANGE),
        api.getInvestmentCatalog(),
        api.getHealth(),
      ]);
      setTransactions(txs);
      setDebts(dbs.map(normalizeDebt));
      setSubscriptions(subs.map(normalizeSubscription));
      setInvestments(portfolio);
      setInvestmentTrend(trend);
      setInvestmentCatalog(catalog);
      setApiHealth(health);
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

  useEffect(() => {
    loadInvestmentTrend(investmentRange).catch(() => {});
  }, [investmentRange, loadInvestmentTrend]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadInvestmentQuotes().catch(() => {});
    }, 45_000);
    return () => clearInterval(timer);
  }, [loadInvestmentQuotes]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadHealth().catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [loadHealth]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadInvestmentTrend(investmentRange).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(timer);
  }, [investmentRange, loadInvestmentTrend]);

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

  const addInvestmentPurchase = async (payload) => {
    await api.addInvestmentLot(payload);
    await Promise.all([
      loadInvestmentQuotes(),
      loadInvestmentTrend(investmentRange),
      loadInvestmentCatalog(),
    ]);
  };

  const deleteInvestmentPurchase = async (id) => {
    await api.deleteInvestmentLot(id);
    await Promise.all([
      loadInvestmentQuotes(),
      loadInvestmentTrend(investmentRange),
      loadInvestmentCatalog(),
    ]);
  };

  return {
    data: {
      transactions,
      debts,
      subscriptions,
      investments,
      investmentTrend,
      investmentRange,
      investmentCatalog,
      apiHealth,
      user: { name: "Willy Pessoa", email: "willypessoa12@gmail.com" },
    },
    loading,
    error,
    refreshInvestments: loadInvestmentQuotes,
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
  };
}
