import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/** 기존 타입 유지: 아래에서 Suggest 응답을 이 형태로 매핑해서 재사용 */
type Addr = { x: string; y: string; roadAddress?: string; jibunAddress?: string };

type TrafastSummary = {
  distance: number;
  duration: number;
  tollFare?: number;
  taxiFare?: number;
  fuelPrice?: number;
};

type DirectionsResponse = {
  route?: {
    trafast?: {
      summary?: TrafastSummary;
    }[];
  };
  message?: string;
  error?: string;
};

type StoredRoute = {
  start: Addr;
  end: Addr;
  waypoints: Addr[];
  summary?: TrafastSummary | null;
};

type WaypointState = {
  id: number;
  addr: Addr | null;
  input: string;
  suggestions: Addr[];
  hasSearched: boolean;
};

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
  const [waypoints, setWaypoints] = useState<WaypointState[]>([]);
  const [result, setResult] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [hasSavedRoute, setHasSavedRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startHasSearched, setStartHasSearched] = useState(false);
  const [endHasSearched, setEndHasSearched] = useState(false);
  const waypointTimers = useRef<Record<number, number>>({});
  const waypointControllers = useRef<Record<number, AbortController | null>>({});
  const STORAGE_KEY = "expressRoute";
  const MAX_WAYPOINTS = 3;

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
  const meterToReadable = (m?: number) => {
    if (!m && m !== 0) return "-";
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  };
  const msToReadable = (ms?: number) => {
    if (!ms && ms !== 0) return "-";
    const totalSec = Math.round(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const parts = [
      hours ? `${hours}시간` : null,
      minutes ? `${minutes}분` : null,
      !hours && !minutes ? `${seconds}초` : null
    ].filter(Boolean);
    return parts.join(" ") || "0초";
  };
  const formatCurrency = (n?: number) => {
    if (!n && n !== 0) return "-";
    return `${Math.round(n).toLocaleString()}원`;
  };

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
    const savedRoute = window.localStorage.getItem(STORAGE_KEY);
    setHasSavedRoute(!!savedRoute);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(waypointTimers.current).forEach((timerId) => window.clearTimeout(timerId));
      Object.values(waypointControllers.current).forEach((controller) => controller?.abort());
    };
  }, []);

    }
  }

  const detailDisabled = !hasSavedRoute;
  const detailHint = detailDisabled
    ? "ℹ️ 네이버 경로 요약이 저장된 이후에만 상세 요약을 볼 수 있어요. 경로를 계산해주세요."
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
              onChange={(e) => {
                setStartInput(e.target.value);
                setError(null);
                if (start) {
                  setStart(null);
                }
                setStartSuggestions([]);
                setStartHasSearched(false);
                if (hasSavedRoute) {
                  setHasSavedRoute(false);
                  setMapUrl("");
                }
              }}
              placeholder="출발지 주소/장소를 입력하세요"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
            {start ? (
              <>
                <span style={{ fontSize: 12, color: "#555" }}>{label(start)} ({start.y}, {start.x})</span>
                <button
                  type="button"
                  onClick={() => {
                    setStart(null);
                    setStartInput("");
                    setStartSuggestions([]);
                    setStartHasSearched(false);
                    setError(null);
                    if (hasSavedRoute) {
                      setHasSavedRoute(false);
                      setMapUrl("");
                    }
                  }}
                >초기화</button>
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
              if (hasSavedRoute) {
                setHasSavedRoute(false);
                setMapUrl("");
              }
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>도착지</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={endInput}
              onChange={(e) => {
                setEndInput(e.target.value);
                setError(null);
                if (end) {
                  setEnd(null);
                }
                setEndSuggestions([]);
                setEndHasSearched(false);
                if (hasSavedRoute) {
                  setHasSavedRoute(false);
                  setMapUrl("");
                }
              }}
              placeholder="도착지 주소/장소를 입력하세요"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
            {end ? (
              <>
                <span style={{ fontSize: 12, color: "#555" }}>{label(end)} ({end.y}, {end.x})</span>
                <button
                  type="button"
                  onClick={() => {
                    setEnd(null);
                    setEndInput("");
                    setEndSuggestions([]);
                    setEndHasSearched(false);
                    setError(null);
                    if (hasSavedRoute) {
                      setHasSavedRoute(false);
                      setMapUrl("");
                    }
                  }}
                >초기화</button>
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
              if (hasSavedRoute) {
                setHasSavedRoute(false);
                setMapUrl("");
              }
            }}
          />
        </div>

        {waypoints.map((wp, idx) => (
          <div key={wp.id}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>경유지 {idx + 1}</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={wp.input}
                onChange={(e) => { handleWaypointInputChange(wp.id, e.target.value); setError(null); }}
                placeholder="경유지 주소/장소를 입력하세요"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
              />
              {wp.addr ? (
                <>
                  <span style={{ fontSize: 12, color: "#555" }}>{label(wp.addr)} ({wp.addr.y}, {wp.addr.x})</span>
                  <button type="button" onClick={() => handleWaypointClear(wp.id)}>초기화</button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#888" }}>미선택</span>
              )}
              <button type="button" onClick={() => removeWaypoint(wp.id)} aria-label={`경유지 ${idx + 1} 삭제`}>
                삭제
              </button>
            </div>
            <SuggestionList
              items={wp.suggestions}
              emptyMessage={getWaypointEmptyMessage(wp)}
              onSelect={(addr) => handleWaypointSelect(wp.id, addr)}
            />
          </div>
        ))}

        <div>
          <button
            type="button"
            onClick={addWaypoint}
            disabled={waypoints.length >= MAX_WAYPOINTS}
          >
            경유지 추가
          </button>
          {waypoints.length >= MAX_WAYPOINTS && (
            <span style={{ marginLeft: 8, fontSize: 12, color: "#666" }}>경유지는 최대 {MAX_WAYPOINTS}개까지 추가할 수 있어요.</span>
          )}
        </div>

        <div>
          <button
            onClick={() => { void confirm(); }}
            disabled={!start || !end}
          >경로 계산</button>
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
