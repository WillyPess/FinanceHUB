const BASE = "/api";

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "API error");
  return json.data;
}

// ── Transactions ──
export const api = {
  transactions: {
    list:   ()     => request("GET",    "/transactions"),
    create: (body) => request("POST",   "/transactions", body),
    update: (id, body) => request("PUT", `/transactions/${id}`, body),
    remove: (id)   => request("DELETE", `/transactions/${id}`),
  },
  debts: {
    list:   ()     => request("GET",    "/debts"),
    create: (body) => request("POST",   "/debts", body),
    update: (id, body) => request("PUT", `/debts/${id}`, body),
    remove: (id)   => request("DELETE", `/debts/${id}`),
  },
  subscriptions: {
    list:   ()     => request("GET",    "/subscriptions"),
    create: (body) => request("POST",   "/subscriptions", body),
    update: (id, body) => request("PUT", `/subscriptions/${id}`, body),
    remove: (id)   => request("DELETE", `/subscriptions/${id}`),
  },
};
