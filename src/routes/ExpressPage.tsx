import { useState } from "react";
import AutoSuggest from "../components/AutoSuggest";

type Pt = { title: string; x: number; y: number; };

function haversine(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371;
  const toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function estimateTaxiFare(km:number) {
  const baseFare = 3800, baseDist = 1.6, perMeter = 100/132;
  return baseFare + Math.max(0, km-baseDist)*1000*perMeter;
}

export default function ExpressPage() {
  const [start, setStart] = useState<Pt | null>(null);
  const [end, setEnd]     = useState<Pt | null>(null);
  const [mapUrl, setMapUrl] = useState<string>("");

  const onConfirm = async () => {
    if (!start || !end) return alert("출발지/도착지를 선택해 주세요.");
    const km = haversine(start.y, start.x, end.y, end.x);
    const fare = Math.round(estimateTaxiFare(km)).toLocaleString();

    // static-map proxy (네이버 REST → 우리 워커)
    const img = `/api/static-map?startX=${start.x}&startY=${start.y}&endX=${end.x}&endY=${end.y}`;
    setMapUrl(img);

    localStorage.setItem("start", JSON.stringify(start));
    localStorage.setItem("end", JSON.stringify(end));

    // 화면에 요약 표시(원하는 대로)
    const el = document.getElementById("result");
    if (el) el.innerHTML = `
      <b>출발:</b> ${start.title}<br>
      <b>도착:</b> ${end.title}<br>
      <b>거리:</b> ${km.toFixed(2)} km<br>
      <b>예상 요금:</b> 약 ${fare}원<br>
    `;
  };

  return (
    <div className="wrap">
      <h2>📍 특송 경로 계산</h2>

      <div className="f">
        <label>출발지</label>
        <AutoSuggest placeholder="도로명/장소 입력" onSelect={(it)=>setStart({title: it.title, x: it.x, y: it.y})} />
      </div>

      <div className="f">
        <label>도착지</label>
        <AutoSuggest placeholder="도로명/장소 입력" onSelect={(it)=>setEnd({title: it.title, x: it.x, y: it.y})} />
      </div>

      <button onClick={onConfirm}>경로 계산</button>
      <div id="result" style={{marginTop:12}}></div>
      {mapUrl ? <img src={mapUrl} style={{width:"100%",marginTop:10}} alt="map" /> : null}
      <a href="/map-summary.html" target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:10}}>🗺️ 상세 경로 보기</a>

      <style>{`
        .wrap{ max-width:680px; margin:0 auto; padding:16px; }
        .f{ margin-bottom:14px; }
        label{ display:block; margin-bottom:6px; font-weight:600; }
        button{ padding:12px 16px; border-radius:10px; border:0; background:#111; color:#fff; }
      `}</style>
    </div>
  );
}
