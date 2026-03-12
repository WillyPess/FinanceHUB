const BASE = "/api";

async function req(method, path, body) {
  const url = method === "GET"
    ? `${BASE}${path}${path.includes("?") ? "&" : "?"}_ts=${Date.now()}`
    : `${BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
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
