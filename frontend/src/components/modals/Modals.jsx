import { useState } from "react";
import { TX_CATS, CAT_ICONS, SUB_CATS, SUB_CAT_ICONS } from "../../constants.js";

/* ─── SHARED ─── */
const overlay = {position:"fixed",inset:0,background:"rgba(15,23,42,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(3px)"};
const modal   = {background:"#fff",borderRadius:16,padding:28,width:440,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,.15)",maxHeight:"90vh",overflowY:"auto"};
const inp     = {width:"100%",padding:"9px 11px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,color:"#0f172a",background:"#f8fafc",fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
const saveBtn = {width:"100%",padding:"11px",background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:8,fontFamily:"inherit"};
const lbl     = {display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:5,letterSpacing:.5};

function Field({label,children}) {
  return <div style={{marginBottom:13}}><label style={lbl}>{label}</label>{children}</div>;
}
function ModalWrap({title,onClose,children}) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#0f172a"}}>{title}</h3>
          <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14,color:"#64748b"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── TRANSACTION MODAL ─── */
export function TxModal({initial, onSave, onClose}) {
  const today = new Date().toISOString().slice(0,10);
  const [f,setF] = useState({type:"expense",amount:"",category:"Food",description:"",date:today,icon:"", ...initial, amount:initial?.amount?.toString()||""});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  return (
    <ModalWrap title={initial?"Edit Transaction":"New Transaction"} onClose={onClose}>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {["expense","income"].map(t=>(
          <button key={t} onClick={()=>set("type",t)} style={{flex:1,padding:"9px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:1,fontFamily:"inherit",background:f.type===t?(t==="income"?"#22c55e":"#ef4444"):"#f1f5f9",color:f.type===t?"#fff":"#94a3b8"}}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <Field label="Description"><input value={f.description} onChange={e=>set("description",e.target.value)} placeholder="What was it?" style={inp}/></Field>
      <Field label="Amount ($)"><input type="number" value={f.amount} onChange={e=>set("amount",e.target.value)} placeholder="0.00" style={inp}/></Field>
      <Field label="Category">
        <select value={f.category} onChange={e=>{set("category",e.target.value);set("icon",CAT_ICONS[e.target.value]||"");}} style={inp}>
          {TX_CATS.map(c=><option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)} style={inp}/></Field>
      <button style={saveBtn} onClick={()=>{
        if(!f.description||!f.amount) return;
        onSave({...f, amount:parseFloat(f.amount), icon:f.icon||CAT_ICONS[f.category]||"📦"});
      }}>{initial?"Save Changes":"Add Transaction"}</button>
    </ModalWrap>
  );
}

/* ─── DEBT MODAL ─── */
export function DebtModal({initial, onSave, onClose}) {
  const today = new Date().toISOString().slice(0,10);
  const [f,setF] = useState({creditor:"",total:"",paid:"0",due_date:today,note:"", ...initial, total:initial?.total?.toString()||"", paid:initial?.paid?.toString()||"0"});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  return (
    <ModalWrap title={initial?"Edit Debt":"New Debt"} onClose={onClose}>
      <Field label="Creditor / Name"><input value={f.creditor} onChange={e=>set("creditor",e.target.value)} placeholder="Bank, person, etc." style={inp}/></Field>
      <Field label="Total Amount ($)"><input type="number" value={f.total} onChange={e=>set("total",e.target.value)} placeholder="0.00" style={inp}/></Field>
      <Field label="Already Paid ($)"><input type="number" value={f.paid} onChange={e=>set("paid",e.target.value)} placeholder="0.00" style={inp}/></Field>
      <Field label="Due Date"><input type="date" value={f.due_date} onChange={e=>set("due_date",e.target.value)} style={inp}/></Field>
      <Field label="Note (optional)"><input value={f.note} onChange={e=>set("note",e.target.value)} placeholder="Optional details..." style={inp}/></Field>
      <button style={saveBtn} onClick={()=>{
        if(!f.creditor||!f.total) return;
        onSave({...f, total:parseFloat(f.total), paid:parseFloat(f.paid||0)});
      }}>{initial?"Save Changes":"Add Debt"}</button>
    </ModalWrap>
  );
}

/* ─── SUBSCRIPTION MODAL ─── */
export function SubModal({initial, onSave, onClose}) {
  const today = new Date().toISOString().slice(0,10);
  const [f,setF] = useState({name:"",icon:"📺",category:"Streaming",amount:"",frequency:"monthly",next_billing:today,status:"active",note:"", ...initial, amount:initial?.amount?.toString()||""});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  return (
    <ModalWrap title={initial?"Edit Subscription":"New Subscription"} onClose={onClose}>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <div style={{width:76}}>
          <label style={lbl}>Icon</label>
          <input value={f.icon} onChange={e=>set("icon",e.target.value)} style={{...inp,textAlign:"center",fontSize:20}} maxLength={4}/>
        </div>
        <div style={{flex:1}}>
          <label style={lbl}>Name</label>
          <input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Netflix, Rent, Phone..." style={inp}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:13}}>
        <div>
          <label style={lbl}>Category</label>
          <select value={f.category} onChange={e=>{set("category",e.target.value);if(!initial)set("icon",SUB_CAT_ICONS[e.target.value]||"📦");}} style={inp}>
            {SUB_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Frequency</label>
          <select value={f.frequency} onChange={e=>set("frequency",e.target.value)} style={inp}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:13}}>
        <div>
          <label style={lbl}>Amount ($)</label>
          <input type="number" value={f.amount} onChange={e=>set("amount",e.target.value)} placeholder="0.00" style={inp}/>
        </div>
        <div>
          <label style={lbl}>Next Billing</label>
          <input type="date" value={f.next_billing} onChange={e=>set("next_billing",e.target.value)} style={inp}/>
        </div>
      </div>

      <div style={{marginBottom:13}}>
        <label style={lbl}>Status</label>
        <div style={{display:"flex",gap:7}}>
          {[["active","✅ Active","#f0fdf4","#22c55e"],["paused","⏸️ Paused","#fffbeb","#f59e0b"],["cancelled","❌ Cancelled","#fef2f2","#ef4444"]].map(([val,label,bg,color])=>(
            <button key={val} onClick={()=>set("status",val)} style={{flex:1,padding:"8px 4px",border:`2px solid ${f.status===val?color:"#e2e8f0"}`,borderRadius:8,background:f.status===val?bg:"#fff",color:f.status===val?color:"#94a3b8",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Note (optional)"><input value={f.note} onChange={e=>set("note",e.target.value)} placeholder="e.g. family plan, due every 1st..." style={inp}/></Field>
      <button style={saveBtn} onClick={()=>{
        if(!f.name||!f.amount) return;
        onSave({...f, amount:parseFloat(f.amount), icon:f.icon||SUB_CAT_ICONS[f.category]||"📦"});
      }}>{initial?"Save Changes":"Add Subscription"}</button>
    </ModalWrap>
  );
}
