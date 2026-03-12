import s from './Sidebar.module.css'

const NAV = [
  { key:"dashboard",     label:"Dashboard",              emoji:"⊞" },
  { key:"transactions",  label:"Transactions",           emoji:"⇄" },
  { key:"subscriptions", label:"Subscriptions & Fixed",  emoji:"🔄" },
  { key:"debts",         label:"Debts",                  emoji:"⊘" },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className={s.sidebar}>
      <div className={s.logo}>
        <div className={s.logoIcon}>💲</div>
        <span className={s.logoText}>FinanceHub</span>
      </div>
      <nav className={s.nav}>
        {NAV.map(item => (
          <button key={item.key} onClick={() => setPage(item.key)}
            className={`${s.btn} ${page === item.key ? s.active : ""}`}>
            <span className={s.icon}>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
