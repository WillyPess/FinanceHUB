import { useState } from "react";
import { useFinanceData } from "./hooks/useFinanceData.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Transactions from "./components/Transactions.jsx";
import Subscriptions from "./components/Subscriptions.jsx";
import Debts from "./components/Debts.jsx";
import { TxModal, DebtModal, SubModal } from "./components/modals/Modals.jsx";

export default function App() {
  const {
    transactions, debts, subscriptions, loading, error,
    addTransaction, updateTransaction, deleteTransaction,
    addDebt, updateDebt, deleteDebt,
    addSubscription, updateSubscription, deleteSubscription,
  } = useFinanceData();

  const [page,    setPage]    = useState("dashboard");
  const [modal,   setModal]   = useState(null);
  const [editing, setEditing] = useState(null);

  const openEdit = (type, item) => { setEditing(item); setModal(`edit-${type}`); };
  const openAdd  = (type)       => { setEditing(null);  setModal(`add-${type}`);  };

  if (loading) return <Splash msg="Loading FinanceHub..." />;
  if (error)   return <Splash msg={error} isError />;

  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar page={page} setPage={setPage} />

      <main style={{flex:1,overflowY:"auto"}}>
        {page==="dashboard" && (
          <Dashboard
            transactions={transactions} debts={debts}
            onEditTx={tx=>openEdit("tx",tx)} onDeleteTx={deleteTransaction}
          />
        )}
        {page==="transactions" && (
          <Transactions
            transactions={transactions}
            onAdd={()=>openAdd("tx")}
            onEdit={tx=>openEdit("tx",tx)}
            onDelete={deleteTransaction}
          />
        )}
        {page==="subscriptions" && (
          <Subscriptions
            subscriptions={subscriptions}
            onAdd={()=>openAdd("sub")}
            onEdit={sub=>openEdit("sub",sub)}
            onDelete={deleteSubscription}
          />
        )}
        {page==="debts" && (
          <Debts
            debts={debts}
            onAdd={()=>openAdd("debt")}
            onEdit={d=>openEdit("debt",d)}
            onDelete={deleteDebt}
          />
        )}
      </main>

      {/* ── Modals ── */}
      {(modal==="add-tx"||modal==="edit-tx") && (
        <TxModal
          initial={modal==="edit-tx"?editing:null}
          onSave={async body => {
            if (modal==="edit-tx") await updateTransaction(editing.id, body);
            else await addTransaction(body);
            setModal(null);
          }}
          onClose={()=>setModal(null)}
        />
      )}
      {(modal==="add-debt"||modal==="edit-debt") && (
        <DebtModal
          initial={modal==="edit-debt"?editing:null}
          onSave={async body => {
            if (modal==="edit-debt") await updateDebt(editing.id, body);
            else await addDebt(body);
            setModal(null);
          }}
          onClose={()=>setModal(null)}
        />
      )}
      {(modal==="add-sub"||modal==="edit-sub") && (
        <SubModal
          initial={modal==="edit-sub"?editing:null}
          onSave={async body => {
            if (modal==="edit-sub") await updateSubscription(editing.id, body);
            else await addSubscription(body);
            setModal(null);
          }}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}

function Splash({msg, isError}) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:16,background:"#f8fafc"}}>
      <div style={{fontSize:40}}>💲</div>
      <p style={{fontSize:15,color:isError?"#ef4444":"#64748b",maxWidth:400,textAlign:"center",lineHeight:1.6}}>{msg}</p>
      {isError && <p style={{fontSize:13,color:"#94a3b8"}}>Run <code style={{background:"#f1f5f9",padding:"2px 6px",borderRadius:4}}>npm run dev</code> inside the <b>backend</b> folder.</p>}
    </div>
  );
}
