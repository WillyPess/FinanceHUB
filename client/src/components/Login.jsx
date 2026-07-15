import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Login.module.css";

export default function Login() {
  const { login, loginLoading, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>$</div>
          <div className={styles.brandName}>FinanceHub</div>
        </div>
        <p className={styles.subtitle}>Sign in to continue</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="••••••••"
            required
          />
        </div>

        {loginError && <div className={styles.error}>{loginError}</div>}

        <button type="submit" className={styles.submitBtn} disabled={loginLoading}>
          {loginLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
