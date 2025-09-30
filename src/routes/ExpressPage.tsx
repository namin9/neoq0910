import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Addr = { x:string; y:string; roadAddress?:string; jibunAddress?:string };

export default function ExpressPage(){
  const [start,setStart]=useState<Addr|null>(null);
  const [end,setEnd]=useState<Addr|null>(null);
  const [result,setResult]=useState("");
  const [mapUrl,setMapUrl]=useState("");
  const [hasSavedRoute,setHasSavedRoute]=useState(false);

  async function geocode(q:string){ if(q.trim().length<2) return [];
    const r=await fetch(`/api/geocode?query=${encodeURIComponent(q)}`);
    const d=await r.json(); return d.addresses||[];
  }
  const km=(la1:number,lo1:number,la2:number,lo2:number)=>{ const R=6371; const toR=(d:number)=>d*Math.PI/180;
    const dLa=toR(la2-la1), dLo=toR(lo2-lo1);
    const a=Math.sin(dLa/2)**2+Math.cos(toR(la1))*Math.cos(toR(la2))*Math.sin(dLo/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  const fare=(k:number)=>3800+Math.max(0,k-1.6)*1000*(100/132);

  async function pick(which:"start"|"end"){
    const q=prompt((which==="start"?"출발지":"도착지")+" 검색어(2자 이상)"); if(!q) return;
    const list=await geocode(q); if(!list.length){ alert("검색 결과 없음"); return; }
    const label=(a:Addr)=>a.roadAddress||a.jibunAddress||`${a.y},${a.x}`;
    const idx=Number(prompt(list.map((a:Addr,i:number)=>`${i+1}. ${label(a)}`).join("\n")+"\n번호 선택"));
    const a=list[idx-1]; if(!a) return; which==="start"?setStart(a):setEnd(a);
  }

  useEffect(()=>{
    if(typeof window==="undefined") return;
    const savedStart=window.localStorage.getItem("start");
    const savedEnd=window.localStorage.getItem("end");
    setHasSavedRoute(!!(savedStart && savedEnd));
  },[]);

  function confirm(){
    if(!start||!end){ setResult("🚫 출발지와 도착지를 모두 선택하세요."); setHasSavedRoute(false); return; }
    const sx=+start.x, sy=+start.y, ex=+end.x, ey=+end.y;
    const d=km(sy,sx,ey,ex); const f=fare(d);
    setResult(`출발지: ${start.roadAddress||start.jibunAddress}\n도착지: ${end.roadAddress||end.jibunAddress}\n거리: ${d.toFixed(2)} km\n예상 요금: 약 ${Math.round(f).toLocaleString()}원`);
    setMapUrl(`/api/static-map?startX=${sx}&startY=${sy}&endX=${ex}&endY=${ey}`);
    localStorage.setItem("start",JSON.stringify(start));
    localStorage.setItem("end",JSON.stringify(end));
    setHasSavedRoute(true);
  }

  const detailDisabled=!hasSavedRoute;
  const detailHint=detailDisabled
    ? "ℹ️ 출발지와 도착지를 선택하고 \"경로 계산\"을 눌러주세요."
    : "ℹ️ 최신 경로 기준으로 상세 요약을 확인할 수 있어요.";

  return (
    <div className="container">
      <h2>🚚 특송 경로 계산</h2>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <button onClick={()=>pick("start")}>출발지 선택</button>
        <button onClick={()=>pick("end")}>도착지 선택</button>
        <button onClick={confirm}>경로 계산</button>
      </div>
      <pre>{result}</pre>
      {mapUrl && <img src={mapUrl} alt="map" style={{width:"100%",marginTop:10}}/>}
      <div className="detail-link-wrapper">
        {detailDisabled ? (
          <span className="detail-link disabled" aria-disabled="true">🗺️ 상세 경로 보기</span>
        ) : (
          <Link className="detail-link" to="/map-summary" target="_blank" rel="noreferrer">🗺️ 상세 경로 보기</Link>
        )}
        <p className="detail-hint">{detailHint}</p>
      </div>
    </div>
  );
}
