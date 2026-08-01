import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Login.module.css";

const MIN_PASSWORD_LENGTH = 12;

export default function Login() {
  const { login, loginLoading, loginError, register, registerLoading, registerError } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState(null);

  const isLogin = mode === "login";
  const loading = isLogin ? loginLoading : registerLoading;
  const error = formError || (isLogin ? loginError : registerError);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) return;
    setFormError(null);

    if (isLogin) {
      await login(username, password);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    await register(username, password);
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>$</div>
          <div className={styles.brandName}>FinanceHub</div>
        </div>
        <p className={styles.subtitle}>{isLogin ? "Sign in to continue" : "Create an account to get started"}</p>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${isLogin ? styles.tabActive : ""}`}
            onClick={() => switchMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${!isLogin ? styles.tabActive : ""}`}
            onClick={() => switchMode("register")}
          >
            Create account
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            placeholder="username"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder={isLogin ? "••••••••" : `at least ${MIN_PASSWORD_LENGTH} characters`}
            required
          />
        </div>

        {!isLogin && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-confirm-password">Confirm password</label>
            <input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {isLogin ? (loading ? "Signing in…" : "Sign in") : (loading ? "Creating account…" : "Create account")}
        </button>
      </form>
    </div>
  );
}
