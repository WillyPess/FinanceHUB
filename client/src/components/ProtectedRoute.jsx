import { useAuth } from "../context/AuthContext.jsx";
import Login from "./Login.jsx";

export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, background: "var(--panel-bg)" }}>
        <div style={{ fontSize: 32, color: "var(--text-primary)" }}>$</div>
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading FinanceHub...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return children;
}
