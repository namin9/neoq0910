import { useEffect, useState } from "react";

type Addr = { x: string; y: string; roadAddress?: string; jibunAddress?: string };
type TrafastSummary = { distance: number; duration: number; tollFare?: number; taxiFare?: number; fuelPrice?: number };
type GuideEntry = { instructions?: string; distance?: number; duration?: number };

type RoutePayload = {
  summary?: TrafastSummary;
  guide?: GuideEntry[];
};

type DirectionsResponse = {
  route?: {
    trafast?: RoutePayload[];
  };
  message?: string;
  error?: string;
};

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

export default function MapSummary() {
  const [start, setStart] = useState<Addr | null>(null);
  const [end, setEnd] = useState<Addr | null>(null);
  const [summary, setSummary] = useState<TrafastSummary | null>(null);
  const [guide, setGuide] = useState<GuideEntry[]>([]);
  const [mapUrl, setMapUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const startRaw = typeof window !== "undefined" ? window.localStorage.getItem("start") : null;
    const endRaw = typeof window !== "undefined" ? window.localStorage.getItem("end") : null;

    if (!startRaw || !endRaw) {
      setError("저장된 출발/도착 정보가 없습니다. 특송 경로 계산 화면에서 경로를 먼저 계산해주세요.");
      setLoading(false);
      return;
    }

    try {
      const parsedStart = JSON.parse(startRaw) as Addr;
      const parsedEnd = JSON.parse(endRaw) as Addr;
      setStart(parsedStart);
      setEnd(parsedEnd);
      const params = new URLSearchParams({
        startX: parsedStart.x,
        startY: parsedStart.y,
        endX: parsedEnd.x,
        endY: parsedEnd.y
      });
      const map = `/api/static-map?${params.toString()}`;
      setMapUrl(map);

      (async () => {
        try {
          const res = await fetch(`/api/directions?${params.toString()}`);
          if (!res.ok) {
            throw new Error("경로 정보를 불러오지 못했습니다.");
          }
          const data: DirectionsResponse = await res.json();
          if (data.error) {
            throw new Error(data.error);
          }
          const trafast = data.route?.trafast?.[0];
          if (!trafast || !trafast.summary) {
            throw new Error(data.message || "경로 요약 데이터를 찾을 수 없습니다.");
          }
          setSummary(trafast.summary);
          setGuide(trafast.guide || []);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
          setLoading(false);
        }
      })();
    } catch (err) {
      console.error(err);
      setError("저장된 위치 정보를 해석할 수 없습니다. 다시 경로를 계산해주세요.");
      setLoading(false);
    }
  }, []);

  const label = (a: Addr | null) => a?.roadAddress || a?.jibunAddress || (a ? `${a.y}, ${a.x}` : "-");

  return (
    <div className="container map-summary">
      <h2>🗺️ 상세 경로 요약</h2>
      {loading && <p className="muted">경로 정보를 불러오는 중입니다...</p>}
      {error && !loading && <p className="alert">{error}</p>}

      {!loading && !error && (
        <>
          <section className="card">
            <h3>기본 정보</h3>
            <dl className="meta">
              <div>
                <dt>출발지</dt>
                <dd>{label(start)}</dd>
              </div>
              <div>
                <dt>도착지</dt>
                <dd>{label(end)}</dd>
              </div>
            </dl>
          </section>

          {summary && (
            <section className="card">
              <h3>요약</h3>
              <dl className="meta">
                <div>
                  <dt>총 거리</dt>
                  <dd>{meterToReadable(summary.distance)}</dd>
                </div>
                <div>
                  <dt>예상 소요 시간</dt>
                  <dd>{msToReadable(summary.duration)}</dd>
                </div>
                {summary.taxiFare !== undefined && (
                  <div>
                    <dt>예상 요금</dt>
                    <dd>{formatCurrency(summary.taxiFare)}</dd>
                  </div>
                )}
                {summary.fuelPrice !== undefined && (
                  <div>
                    <dt>연료비</dt>
                    <dd>{formatCurrency(summary.fuelPrice)}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {guide.length > 0 && (
            <section className="card">
              <h3>이동 안내</h3>
              <ol className="guide">
                {guide.map((g, idx) => (
                  <li key={idx}>
                    <p>{g.instructions || "다음 안내"}</p>
                    <small className="muted">
                      {meterToReadable(g.distance)} · {msToReadable(g.duration)}
                    </small>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {mapUrl && (
            <section className="card">
              <h3>지도 미리보기</h3>
              <img src={mapUrl} alt="경로 미리보기 지도" className="map-preview" />
            </section>
          )}
        </>
      )}
    </div>
  );
}
