import { useState } from "react";
import { useFinanceData } from "./hooks/useFinanceData.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Transactions from "./components/Transactions.jsx";
import Subscriptions from "./components/Subscriptions.jsx";
import Debts from "./components/Debts.jsx";
import TxModal from "./components/modals/TxModal.jsx";
import DebtModal from "./components/modals/DebtModal.jsx";
import SubModal from "./components/modals/SubModal.jsx";

export default function App() {
  const {
    data, loading, error,
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt, deleteDebt,
    addSubscription, updateSubscription, deleteSubscription,
  } = useFinanceData();

  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);

  const openEditTx  = (tx) => { setEditing(tx); setModal("edit-tx"); };
  const openEditDebt = (d)  => { setEditing(d);  setModal("edit-debt"); };
  const openEditSub  = (s)  => { setEditing(s);  setModal("edit-sub"); };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:32 }}>💲</div>
      <div style={{ color:"#64748b", fontSize:14 }}>Loading FinanceHub...</div>
    </div>
  );

  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16, padding:32 }}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <div style={{ fontWeight:700, fontSize:18, color:"#0f172a" }}>Cannot connect to server</div>
      <div style={{ color:"#64748b", fontSize:14, textAlign:"center", maxWidth:400 }}>{error}</div>
      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"16px 20px", fontSize:13, color:"#374151", fontFamily:"monospace" }}>
        Make sure you ran: <b>npm run dev</b> from the project root
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", padding:"18px", background:"#edf1ed" }}>
      <div style={{ display:"flex", minHeight:"calc(100vh - 36px)", background:"#f7f9f7", border:"1px solid #d7dfd7", borderRadius:"24px", overflow:"hidden", boxShadow:"0 8px 24px rgba(16,24,40,0.05)" }}>
      <Sidebar page={page} setPage={setPage} user={data.user} />
      <main style={{ flex:1, overflowY:"auto", background:"#fcfdfc" }}>
        {page === "dashboard"     && <Dashboard data={data} onEditTx={openEditTx} onDeleteTx={deleteTransaction} />}
        {page === "transactions"  && <Transactions transactions={data.transactions} onAdd={()=>{setEditing(null);setModal("add-tx");}} onEdit={openEditTx} onDelete={deleteTransaction} />}
        {page === "subscriptions" && <Subscriptions subscriptions={data.subscriptions} onAdd={()=>{setEditing(null);setModal("add-sub");}} onEdit={openEditSub} onDelete={deleteSubscription} />}
        {page === "debts"         && <Debts debts={data.debts} onAdd={()=>{setEditing(null);setModal("add-debt");}} onEdit={openEditDebt} onDelete={deleteDebt} />}
      </main>
      </div>

      {(modal==="add-tx"||modal==="edit-tx") && (
        <TxModal initial={modal==="edit-tx"?editing:null}
          onSave={tx=>{ modal==="edit-tx"?updateTransaction(tx):addTransaction(tx); setModal(null); }}
          onClose={()=>setModal(null)} />
      )}
      {(modal==="add-debt"||modal==="edit-debt") && (
        <DebtModal initial={modal==="edit-debt"?editing:null}
          onSave={d=>{ modal==="edit-debt"?updateDebt(d):addDebt(d); setModal(null); }}
          onClose={()=>setModal(null)} />
      )}
      {(modal==="add-sub"||modal==="edit-sub") && (
        <SubModal initial={modal==="edit-sub"?editing:null}
          onSave={s=>{ modal==="edit-sub"?updateSubscription(s):addSubscription(s); setModal(null); }}
          onClose={()=>setModal(null)} />
      )}
    </div>
  );
}
