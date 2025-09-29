import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Enter(){
  const [code,setCode]=useState(""); const [err,setErr]=useState("");
  const nav=useNavigate();
  const submit=(e:React.FormEvent)=>{ e.preventDefault();
    const VALID = import.meta.env.VITE_ENTRY_CODE || "neoqik-proto";
    if(code===VALID){ localStorage.setItem("ENTRY_OK","1"); nav("/",{replace:true}); }
    else setErr("입장 코드가 올바르지 않습니다.");
  };
  return (
    <div className="container">
      <form onSubmit={submit}>
        <h2>입장 코드</h2>
        <input type="password" value={code} onChange={e=>setCode(e.target.value)} placeholder="코드를 입력하세요"/>
        <button type="submit">입장</button>
        {err && <p style={{color:"#f87171"}}>{err}</p>}
      </form>
    </div>
  );
}
