import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Enter() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const VALID = import.meta.env.VITE_ENTRY_CODE || "neoqik-proto";
    if (code === VALID) {
      localStorage.setItem("ENTRY_OK","1");
      nav("/", { replace: true });
    } else {
      setErr("입장 코드가 올바르지 않습니다.");
    }
  };

  return (
    <div className="container">
      <form className="card" onSubmit={handleSubmit}>
        <h1>입장 코드</h1>
        <input
          autoFocus
          type="password"
          placeholder="코드를 입력하세요"
          value={code}
          onChange={(e)=>setCode(e.target.value)}
        />
        <button type="submit">입장</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}
