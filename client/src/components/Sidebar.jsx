import styles from "./Sidebar.module.css";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "grid" },
  { key: "transactions", label: "Transactions", icon: "transfer" },
  { key: "debts", label: "Debts", icon: "debt" },
];

export default function Sidebar({ page, setPage, user }) {
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
            <NavIcon type={item.icon} active={page === item.key} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.userCard}>
        <div className={styles.avatar}>{user.name[0]}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.userEmail}>{user.email}</div>
        </div>
        <button className={styles.logoutBtn} type="button">
          Exit
        </button>
      </div>
    </aside>
  );
}

function NavIcon({ type, active }) {
  const stroke = active ? "#23a36b" : "#667085";

  if (type === "grid") {
    return (
      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }

  if (type === "transfer") {
    return (
      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h13" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M13 3l4 4-4 4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 17H7" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M11 13l-4 4 4 4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke={stroke} strokeWidth="2" />
      <path d="M13 6h4l3 3-6 6-4-4 3-3z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 20c0-2.5 2-4.5 4.5-4.5h2.5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
