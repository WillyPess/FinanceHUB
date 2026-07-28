import { useState } from "react";
import { API_BASE } from "../utils/apiBase.js";
import { getAccessToken } from "../utils/authClient.js";
import styles from "./CreateUser.module.css";

const MIN_PASSWORD_LENGTH = 12;

export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create user.");
        return;
      }

      setSuccess(`User "${data.username}" created successfully.`);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (_err) {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Creation</h1>
        <p className={styles.subtitle}>Add a new account to FinanceHub</p>
      </div>

      <div className={styles.cardWrap}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>+</div>
            <div className={styles.brandName}>New account</div>
          </div>
          <p className={styles.formSubtitle}>Create credentials for another household member</p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="create-username">Username</label>
            <input
              id="create-username"
              type="text"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="create-password">Password</label>
            <input
              id="create-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder={`at least ${MIN_PASSWORD_LENGTH} characters`}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="create-confirm-password">Confirm password</label>
            <input
              id="create-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Creating…" : "Create user"}
          </button>
        </form>
      </div>
    </div>
  );
}
