import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fmt, fmtDate } from "../utils/formatters.js";
import { CAT_COLORS, MONTHS } from "../constants.js";
import s from "./Dashboard.module.css";

export default function Dashboard({ transactions, debts, onEditTx, onDeleteTx }) {
  const totalIncome  = transactions.filter(t => t.type==="income").reduce((a,t)  => a+t.amount, 0);
  const totalExpense = transactions.filter(t => t.type==="expense").reduce((a,t) => a+t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const pendingDebts = debts.reduce((a,d) => a + (d.total - d.paid), 0);

  const barData = useMemo(() => {
    const now = new Date();
    return Array.from({length:6}, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const inc = transactions.filter(t => t.type==="income"  && t.date?.startsWith(m)).reduce((a,t)=>a+t.amount,0);
      const exp = transactions.filter(t => t.type==="expense" && t.date?.startsWith(m)).reduce((a,t)=>a+t.amount,0);
      return { name: MONTHS[d.getMonth()], Income: inc, Expenses: exp };
    });
  }, [transactions]);

  const pieData = useMemo(() => {
    const byCat = transactions.filter(t=>t.type==="expense").reduce((acc,t) => {
      acc[t.category]=(acc[t.category]||0)+t.amount; return acc;
    }, {});
    return Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([name,value]) => ({
      name, value, pct: totalExpense>0?((value/totalExpense)*100).toFixed(0):0,
      color: CAT_COLORS[name]||"#94a3b8",
    }));
  }, [transactions, totalExpense]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div><h1 className={s.title}>Dashboard</h1><p className={s.sub}>Your financial overview</p></div>
      </div>

      <div className={s.statsGrid}>
        <StatCard label="TOTAL INCOME"   value={fmt(totalIncome)}  color="#22c55e" bg="#f0fdf4" icon="📈" />
        <StatCard label="TOTAL EXPENSES" value={fmt(totalExpense)} color="#ef4444" bg="#fef2f2" icon="📉" />
        <StatCard label="BALANCE"        value={fmt(balance)}      color="#3b82f6" bg="#eff6ff" icon="👛" />
        <StatCard label="PENDING DEBTS"  value={fmt(pendingDebts)} color="#f59e0b" bg="#fffbeb" icon="🧾" />
      </div>

      <div className={s.chartsGrid}>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={barData} barCategoryGap="35%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#94a3b8"}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#94a3b8"}} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v}`} />
              <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:8,border:"1px solid #e2e8f0",fontSize:12}} />
              <Bar dataKey="Income"   fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className={s.legend}>
            <Dot color="#22c55e" label="Income" />
            <Dot color="#ef4444" label="Expenses" />
          </div>
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}>Spending by Category</h3>
          <div className={s.pieWrap}>
            <PieChart width={150} height={150}>
              <Pie data={pieData} cx={70} cy={70} innerRadius={40} outerRadius={70} startAngle={180} endAngle={0} dataKey="value" paddingAngle={2}>
                {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
            </PieChart>
            <div>{pieData.slice(0,8).map(p=>(
              <div key={p.name} className={s.pieRow}>
                <div className={s.pieDot} style={{background:p.color}}/>
                <span className={s.pieName}>{p.name}</span>
                <span className={s.piePct}>{p.pct}%</span>
              </div>
            ))}</div>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>Recent Transactions</h3>
        {transactions.slice(0,6).map(tx=>(
          <TxRow key={tx.id} tx={tx} onEdit={onEditTx} onDelete={onDeleteTx} />
        ))}
        {transactions.length===0 && <p className={s.empty}>No transactions yet.</p>}
      </div>
    </div>
  );
}

function StatCard({label,value,color,bg,icon}) {
  return (
    <div style={{background:bg,border:"1px solid transparent",borderRadius:14,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#94a3b8"}}>{label}</div>
        <div style={{width:32,height:32,background:"#fff",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>{icon}</div>
      </div>
      <div style={{fontSize:24,fontWeight:800,color}}>{value}</div>
    </div>
  );
}

function TxRow({tx,onEdit,onDelete}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f8fafc"}}>
      <span style={{fontSize:20}}>{tx.icon||"📦"}</span>
      <div style={{flex:1}}>
        <div style={{fontWeight:600,fontSize:13}}>{tx.description}</div>
        <div style={{fontSize:11,color:"#94a3b8"}}>{tx.category} · {fmtDate(tx.date)}</div>
      </div>
      <span style={{fontWeight:700,color:tx.type==="income"?"#22c55e":"#ef4444",fontSize:14}}>
        {tx.type==="income"?"↗":"↘"} {fmt(tx.amount)}
      </span>
      <button onClick={()=>onEdit(tx)} style={iBtn}>✏️</button>
      <button onClick={()=>onDelete(tx.id)} style={iBtn}>🗑️</button>
    </div>
  );
}

function Dot({color,label}) {
  return <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#64748b"}}><div style={{width:10,height:10,borderRadius:"50%",background:color}}/>{label}</div>;
}

const iBtn = {background:"transparent",border:"none",cursor:"pointer",fontSize:15,padding:"4px 6px",opacity:0.6};

s.empty = s.empty || "";
