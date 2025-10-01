import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/** 기존 타입 유지: 아래에서 Suggest 응답을 이 형태로 매핑해서 재사용 */
type Addr = { x: string; y: string; roadAddress?: string; jibunAddress?: string };

type SuggestionListProps = {
  items: Addr[];
  onSelect: (addr: Addr) => void;
  emptyMessage?: string;
};

function SuggestionList({ items, onSelect, emptyMessage }: SuggestionListProps) {
  if (!items.length) {
    return emptyMessage ? <p style={{ margin: "4px 0" }}>{emptyMessage}</p> : null;
  }
  return (
    <ul style={{ margin: "4px 0 8px", padding: 0, listStyle: "none", border: "1px solid #ddd", borderRadius: 4 }}>
      {items.map((item, index) => {
        const label = item.roadAddress || item.jibunAddress || `${item.y}, ${item.x}`;
        return (
          <li
            key={`${item.x}-${item.y}-${index}`}
            style={{ padding: "8px 12px", cursor: "pointer", borderBottom: index === items.length - 1 ? "none" : "1px solid #eee" }}
            onClick={() => onSelect(item)}
          >
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 12, color: "#666" }}>({item.y}, {item.x})</div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ExpressPage() {
  const [start, setStart] = useState<Addr | null>(null);
  const [end, setEnd] = useState<Addr | null>(null);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [startSuggestions, setStartSuggestions] = useState<Addr[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<Addr[]>([]);
  const [result, setResult] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [hasSavedRoute, setHasSavedRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startHasSearched, setStartHasSearched] = useState(false);
  const [endHasSearched, setEndHasSearched] = useState(false);

  /**
   * ✅ 변경 1) 자동완성 소스: /api/suggest 로 변경
   * - 서버는 { items:[{title, subtitle?, x, y, type}] } 형태를 반환
   * - 여기서는 UI 변경 없이 기존 Addr 타입으로 매핑
   */
  async function suggest(q: string, signal?: AbortSignal): Promise<Addr[]> {
    if (q.trim().length < 2) return [];
    const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal });
    if (!r.ok) {
      throw new Error("주소/장소 추천 중 오류가 발생했어요.");
    }
    const d = await r.json();
    const items: any[] = d.items || [];
    return items
      .filter((it) => {
        const x = Number(it.x);
        const y = Number(it.y);
        return Number.isFinite(x) && Number.isFinite(y);
      })
      .map((it) => ({
        x: String(it.x),
        y: String(it.y),
        // Suggest는 title/subtitle만 오므로 라벨로 매핑
        roadAddress: it.title,           // 메인 라벨
        jibunAddress: it.subtitle || ""  // 보조 라벨
      })) as Addr[];
  }

  /** (참고) 기존 Haversine/요금 로직은 그대로 사용 */
  const km = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371; const toR = (d: number) => d * Math.PI / 180;
    const dLa = toR(la2 - la1), dLo = toR(lo2 - lo1);
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(toR(la1)) * Math.cos(toR(la2)) * Math.sin(dLo / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const fare = (k: number) => 3800 + Math.max(0, k - 1.6) * 1000 * (100 / 132);

  const label = (a: Addr) => a.roadAddress || a.jibunAddress || `${a.y}, ${a.x}`;

  async function geocodeWithNaver(query: string): Promise<{ x: string; y: string }> {
    const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("네이버 지오코딩 호출에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
    const data = await response.json();
    const first = data?.addresses?.[0];
    if (!first || !first.x || !first.y) {
      throw new Error("네이버에서 좌표를 찾지 못했어요. 다른 주소로 검색해 주세요.");
    }
    return { x: String(first.x), y: String(first.y) };
  }

  /** ✅ 변경 2) startInput → /api/suggest */
  useEffect(() => {
    const controller = new AbortController();
    if (startInput.trim().length < 2) { setStartSuggestions([]); setStartHasSearched(false); return () => controller.abort(); }
    setStartHasSearched(false);
    const handler = setTimeout(async () => {
      try {
        setStartHasSearched(true);
        const addresses = await suggest(startInput, controller.signal);
        setStartSuggestions(addresses);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
          setStartSuggestions([]);
          setStartHasSearched(false);
        }
      }
    }, 350);
    return () => { clearTimeout(handler); controller.abort(); };
  }, [startInput]);

  /** ✅ 변경 3) endInput → /api/suggest */
  useEffect(() => {
    const controller = new AbortController();
    if (endInput.trim().length < 2) { setEndSuggestions([]); setEndHasSearched(false); return () => controller.abort(); }
    setEndHasSearched(false);
    const handler = setTimeout(async () => {
      try {
        setEndHasSearched(true);
        const addresses = await suggest(endInput, controller.signal);
        setEndSuggestions(addresses);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
          setEndSuggestions([]);
          setEndHasSearched(false);
        }
      }
    }, 350);
    return () => { clearTimeout(handler); controller.abort(); };
  }, [endInput]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedStart = window.localStorage.getItem("start");
    const savedEnd = window.localStorage.getItem("end");
    setHasSavedRoute(!!(savedStart && savedEnd));
  }, []);

  async function confirm() {
    if (!start || !end) {
      setResult("🚫 출발지와 도착지를 모두 선택하세요.");
      setHasSavedRoute(false);
      return;
    }

    try {
      setError(null);
      const startLabel = label(start);
      const endLabel = label(end);
      const [startGeo, endGeo] = await Promise.all([
        geocodeWithNaver(startLabel),
        geocodeWithNaver(endLabel)
      ]);

      const nextStart = { ...start, x: startGeo.x, y: startGeo.y };
      const nextEnd = { ...end, x: endGeo.x, y: endGeo.y };

      setStart(nextStart);
      setEnd(nextEnd);

      // 좌표 문자열 → 숫자
      const sx = +nextStart.x, sy = +nextStart.y, ex = +nextEnd.x, ey = +nextEnd.y;
      const d = km(sy, sx, ey, ex);
      const f = fare(d);

      setResult(
        `출발지: ${label(nextStart)}\n도착지: ${label(nextEnd)}\n거리: ${d.toFixed(2)} km\n예상 요금: 약 ${Math.round(f).toLocaleString()}원`
      );
      // 네이버 Static Map 프록시
      setMapUrl(`/api/static-map?startX=${sx}&startY=${sy}&endX=${ex}&endY=${ey}`);

      localStorage.setItem("start", JSON.stringify(nextStart));
      localStorage.setItem("end", JSON.stringify(nextEnd));
      localStorage.setItem("start_naver", JSON.stringify(startGeo));
      localStorage.setItem("end_naver", JSON.stringify(endGeo));

      setHasSavedRoute(true);
    } catch (err) {
      const message = (err as Error)?.message || "네이버 좌표를 불러오는 중 문제가 발생했어요.";
      setError(message);
      setResult("🚫 네이버 좌표 조회에 실패했어요. 다시 시도해주세요.");
      setMapUrl("");
      setHasSavedRoute(false);
    }
  }

  const detailDisabled = !hasSavedRoute;
  const detailHint = detailDisabled
    ? "ℹ️ 출발지와 도착지를 선택하고 \"경로 계산\"을 눌러주세요."
    : "ℹ️ 최신 경로 기준으로 상세 요약을 확인할 수 있어요.";

  const startEmptyMessage = startInput.trim().length < 2
    ? "2자 이상 입력해주세요."
    : !error && startHasSearched && startSuggestions.length === 0
      ? "검색 결과가 없어요."
      : undefined;

  const endEmptyMessage = endInput.trim().length < 2
    ? "2자 이상 입력해주세요."
    : !error && endHasSearched && endSuggestions.length === 0
      ? "검색 결과가 없어요."
      : undefined;

  return (
    <div className="container">
      <h2>🚚 특송 경로 계산</h2>
      {error && (
        <div style={{ background: "#ffecec", border: "1px solid #ff9d9d", padding: "8px 12px", marginBottom: 12, borderRadius: 4 }}>
          ⚠️ {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>출발지</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={startInput}
              onChange={(e) => { setStartInput(e.target.value); setError(null); }}
              placeholder="출발지 주소/장소를 입력하세요"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
            {start ? (
              <>
                <span style={{ fontSize: 12, color: "#555" }}>{label(start)} ({start.y}, {start.x})</span>
                <button type="button" onClick={() => { setStart(null); setStartInput(""); setStartSuggestions([]); setError(null); }}>초기화</button>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "#888" }}>미선택</span>
            )}
          </div>
          <SuggestionList
            items={startSuggestions}
            emptyMessage={startEmptyMessage}
            onSelect={(addr) => {
              setStart(addr);
              setStartInput(label(addr));
              setStartSuggestions([]);
              setError(null);
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>도착지</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={endInput}
              onChange={(e) => { setEndInput(e.target.value); setError(null); }}
              placeholder="도착지 주소/장소를 입력하세요"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
            {end ? (
              <>
                <span style={{ fontSize: 12, color: "#555" }}>{label(end)} ({end.y}, {end.x})</span>
                <button type="button" onClick={() => { setEnd(null); setEndInput(""); setEndSuggestions([]); setError(null); }}>초기화</button>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "#888" }}>미선택</span>
            )}
          </div>
          <SuggestionList
            items={endSuggestions}
            emptyMessage={endEmptyMessage}
            onSelect={(addr) => {
              setEnd(addr);
              setEndInput(label(addr));
              setEndSuggestions([]);
              setError(null);
            }}
          />
        </div>

        <div>
          <button onClick={() => { void confirm(); }}>경로 계산</button>
        </div>
      </div>

      <pre>{result}</pre>
      {mapUrl && <img src={mapUrl} alt="map" style={{ width: "100%", marginTop: 10 }} />}
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
