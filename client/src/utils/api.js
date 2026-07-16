import { getAccessToken, refreshAccessToken, notifySessionExpired } from "./authClient.js";
import { API_BASE } from "./apiBase.js";

const BASE = `${API_BASE}/api`;

async function rawRequest(method, path, body) {
  const url = method === "GET"
    ? `${BASE}${path}${path.includes("?") ? "&" : "?"}_ts=${Date.now()}`
    : `${BASE}${path}`;

  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(url, {
    method,
    headers,
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Attaches the bearer token to every call; on a 401 it silently refreshes once and
// retries, and only gives up (redirecting to login) if the refresh itself fails.
async function req(method, path, body) {
  let res = await rawRequest(method, path, body);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      notifySessionExpired();
      throw new Error("Session expired");
    }
    res = await rawRequest(method, path, body);
  }

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// Transactions
export const getTx    = ()       => req("GET",    "/transactions");
export const addTx    = (data)   => req("POST",   "/transactions", data);
export const updateTx = (id, d)  => req("PUT",    `/transactions/${id}`, d);
export const deleteTx = (id)     => req("DELETE", `/transactions/${id}`);

// Debts
export const getDebts    = ()      => req("GET",    "/debts");
export const addDebt     = (data)  => req("POST",   "/debts", data);
export const updateDebt  = (id, d) => req("PUT",    `/debts/${id}`, d);
export const deleteDebt  = (id)    => req("DELETE", `/debts/${id}`);

// Subscriptions
export const getSubs    = ()      => req("GET",    "/subscriptions");
export const addSub     = (data)  => req("POST",   "/subscriptions", data);
export const updateSub  = (id, d) => req("PUT",    `/subscriptions/${id}`, d);
export const deleteSub  = (id)    => req("DELETE", `/subscriptions/${id}`);

// Investments
export const getHealth = ()             => req("GET", "/health");
export const getInvestments = ()       => req("GET", "/investments");
export const getInvestmentsTrend = (range = "1M") => req("GET", `/investments/trend?range=${range}`);
export const getInvestmentCatalog = () => req("GET", "/investments/catalog");
export const addInvestmentLot = (data) => req("POST", "/investments/lots", data);
export const deleteInvestmentLot = (id) => req("DELETE", `/investments/lots/${id}`);
