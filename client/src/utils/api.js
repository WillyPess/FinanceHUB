const BASE = "/api";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
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
