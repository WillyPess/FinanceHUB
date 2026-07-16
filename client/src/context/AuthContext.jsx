import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAccessToken, refreshAccessToken, setSessionExpiredHandler } from "../utils/authClient.js";
import { API_BASE } from "../utils/apiBase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  // On first load there's no access token in memory yet — try the httpOnly refresh
  // cookie to restore a session before deciding whether to show the login page.
  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          setUser(await res.json());
        } else {
          setAccessToken(null);
        }
      } catch (_error) {
        setAccessToken(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (username, password) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setLoginError("Invalid username or password.");
        return false;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
      return true;
    } catch (_error) {
      setLoginError("Could not reach the server. Please try again.");
      return false;
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch (_error) {
      // Best effort — clear local state regardless of whether the request landed.
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, loginLoading, loginError }),
    [user, initializing, login, logout, loginLoading, loginError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
