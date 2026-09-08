import Icon from "./icons.jsx";
import styles from "./Sidebar.module.css";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "grid" },
  { key: "transactions", label: "Transactions", icon: "list" },
  { key: "investments", label: "Investments", icon: "chart" },
  { key: "fixed-costs", label: "Fixed Costs", icon: "repeat" },
  { key: "debts", label: "Debts", icon: "exchange" },
];

export default function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>$</div>
        <div className={styles.brandName}>FinanceHub</div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={`${styles.navBtn} ${page === item.key ? styles.active : ""}`}
          >
            <Icon name={item.icon} size={19} className={styles.navIcon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.userCard}>
        <div className={styles.avatar}>{user.name[0]}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.userEmail}>{user.username}</div>
        </div>
        <button className={styles.logoutBtn} type="button" onClick={onLogout} title="Log out">
          Exit
        </button>
      </div>
    </aside>
  );
}
