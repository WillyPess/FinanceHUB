// The access token lives only in memory (a plain module variable), never localStorage —
// it vanishes on tab close/reload, which limits what an XSS payload could exfiltrate.
// The longer-lived refresh token is an httpOnly cookie this JS layer can never read;
// that's why a fresh page load has to round-trip through /auth/refresh to get a token again.
import { API_BASE } from "./apiBase.js";

let accessToken = null;
let onSessionExpired = () => {};
let refreshInFlight = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Coalesces concurrent 401s from multiple in-flight requests into a single refresh call.
export async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data = await res.json();
      accessToken = data.accessToken;
      return accessToken;
    } catch (_error) {
      accessToken = null;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function notifySessionExpired() {
  accessToken = null;
  onSessionExpired();
}
