import { useState } from "react";

type Addr = { x:string; y:string; roadAddress?:string; jibunAddress?:string };

export default function ExpressPage(){
  const [start,setStart]=useState<Addr|null>(null);
  const [end,setEnd]=useState<Addr|null>(null);
  const [result,setResult]=useState(""); const [mapUrl,setMapUrl]=useState("");

  async function find(query:string){ if(query.trim().length<2) return [];
    const r=await fetch(`/api/geocode?query=${encodeURIComponent(query)}`); const d=await r.json(); return d.addresses||[];
  }
  function km(lat1:number,lon1:number,lat2:number,lon2:number){ const R=6371,toRad=(d:number)=>d*Math.PI/180;
    const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  function fare(k:number){ const base=3800,baseD=1.6,perM=100/132; return base+Math.max(0,k-baseD)*1000*perM; }

  async function pick(which:"start"|"end"){
    const q=prompt((which==="start"?"출발지":"도착지")+" 검색어(2자 이상)"); if(!q) return;
    const list=await find(q); if(!list.length){ alert("검색 결과 없음"); return; }
    const label=(a:Addr)=>a.roadAddress||a.jibunAddress||`${a.y},${a.x}`;
    const idx=Number(prompt(list.map((a:Addr,i:number)=>`${i+1}. ${label(a)}`).join("\n")+"\n번호 선택"));
    const a=list[idx-1]; if(!a) return;
    which==="start"?setStart(a):setEnd(a);
  }

  function confirm(){
    if(!start||!end){ setResult("🚫 출발지와 도착지를 모두 선택하세요."); return; }
    const sx=+start.x, sy=+start.y, ex=+end.x, ey=+end.y;
    const d=km(sy,sx,ey,ex); const f=fare(d);
    setResult(`출발지: ${start.roadAddress||start.jibunAddress}\n도착지: ${end.roadAddress||end.jibunAddress}\n거리: ${d.toFixed(2)} km\n예상 요금: 약 ${Math.round(f).toLocaleString()}원`);
    setMapUrl(`/api/static-map?startX=${sx}&startY=${sy}&endX=${ex}&endY=${ey}`);
    localStorage.setItem("start",JSON.stringify(start));
    localStorage.setItem("end",JSON.stringify(end));
  }

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
      <div style={{marginTop:8}}><a href="/map-summary.html" target="_blank">🗺️ 상세 경로 보기</a></div>
    </div>
  );
}
