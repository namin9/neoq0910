import { useEffect, useMemo, useState } from "react";

type Addr = { x: string; y: string; roadAddress?: string; jibunAddress?: string };
type StoredRoute = { start: Addr; end: Addr; waypoints?: Addr[] | null };
type TrafastSummary = { distance: number; duration: number; tollFare?: number; taxiFare?: number; fuelPrice?: number };
type GuideEntry = {
  instructions?: string;
  distance?: number;
  duration?: number;
  pointIndex?: number;
  type?: number;
};

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

const waypointQueryValue = (waypoints: Addr[]) =>
  waypoints
    .filter((wp) => wp && typeof wp.x === "string" && typeof wp.y === "string")
    .map((wp) => `${wp.x},${wp.y}`)
    .join("|");

export default function MapSummary() {
  const [start, setStart] = useState<Addr | null>(null);
  const [end, setEnd] = useState<Addr | null>(null);
  const [waypoints, setWaypoints] = useState<Addr[]>([]);
  const [summary, setSummary] = useState<TrafastSummary | null>(null);
  const [guide, setGuide] = useState<GuideEntry[]>([]);
  const [mapUrl, setMapUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const routeRaw = typeof window !== "undefined" ? window.localStorage.getItem("route") : null;
        const startRaw = typeof window !== "undefined" ? window.localStorage.getItem("start") : null;
        const endRaw = typeof window !== "undefined" ? window.localStorage.getItem("end") : null;

        let storedRoute: StoredRoute | null = null;

        if (routeRaw) {
          storedRoute = JSON.parse(routeRaw) as StoredRoute;
        } else if (startRaw && endRaw) {
          storedRoute = {
            start: JSON.parse(startRaw) as Addr,
            end: JSON.parse(endRaw) as Addr,
            waypoints: []
          };
        }

        if (!storedRoute?.start || !storedRoute?.end) {
          throw new Error("저장된 경로 정보를 찾을 수 없습니다. 특송 경로 계산 화면에서 경로를 먼저 계산해주세요.");
        }

        const parsedStart = storedRoute.start;
        const parsedEnd = storedRoute.end;
        const parsedWaypoints = Array.isArray(storedRoute.waypoints)
          ? storedRoute.waypoints.filter((wp): wp is Addr => Boolean(wp))
          : [];

        setStart(parsedStart);
        setEnd(parsedEnd);
        setWaypoints(parsedWaypoints);

        const params = new URLSearchParams({
          startX: parsedStart.x,
          startY: parsedStart.y,
          endX: parsedEnd.x,
          endY: parsedEnd.y
        });

        if (parsedWaypoints.length) {
          params.set("waypoints", waypointQueryValue(parsedWaypoints));
        }

        setMapUrl(`/api/static-map?${params.toString()}`);

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
    };

    load();
  }, []);

  const label = (a: Addr | null) => a?.roadAddress || a?.jibunAddress || (a ? `${a.y}, ${a.x}` : "-");
  const waypointLabel = (a: Addr, idx: number) => `${idx + 1}. ${label(a)}`;

  const segmentTitles = useMemo(() => {
    if (!start || !end) return [] as string[];
    const points = [start, ...waypoints, end];
    const nameForIndex = (index: number) => {
      if (index === 0) return "출발지";
      if (index === points.length - 1) return "도착지";
      return `경유지 ${index}`;
    };
    const titles: string[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      titles.push(`${nameForIndex(i)} → ${nameForIndex(i + 1)}`);
    }
    return titles;
  }, [start, end, waypoints]);

  const decoratedGuide = useMemo(() => {
    if (!guide.length) return [] as Array<{ type: "segment"; label: string } | { type: "entry"; entry: GuideEntry; key: number }>;

    const items: Array<{ type: "segment"; label: string } | { type: "entry"; entry: GuideEntry; key: number }> = [];
    if (segmentTitles[0]) {
      items.push({ type: "segment", label: segmentTitles[0] });
    }

    let currentSegment = 0;
    let waypointHitCount = 0;
    const targetWaypointCount = waypoints.length;

    const isWaypointArrival = (entry: GuideEntry) => {
      if (waypointHitCount >= targetWaypointCount) return false;
      if (entry.type === 3) return true;
      const normalized = (entry.instructions || "").replace(/\s+/g, "");
      if (!normalized) return false;
      return /경유지|경유|passpoint|waypoint|중간지점/i.test(normalized);
    };

    guide.forEach((entry, index) => {
      items.push({ type: "entry", entry, key: index });

      if (isWaypointArrival(entry)) {
        waypointHitCount += 1;
        currentSegment += 1;
        if (segmentTitles[currentSegment]) {
          items.push({ type: "segment", label: segmentTitles[currentSegment] });
        }
      }
    });

    while (currentSegment < segmentTitles.length - 1) {
      currentSegment += 1;
      items.push({ type: "segment", label: segmentTitles[currentSegment] });
    }

    return items;
  }, [guide, segmentTitles, waypoints.length]);

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
                <dt>경유지</dt>
                <dd>
                  {waypoints.length > 0 ? (
                    <ol className="waypoint-list">
                      {waypoints.map((wp, idx) => (
                        <li key={`${wp.x}-${wp.y}-${idx}`}>{waypointLabel(wp, idx)}</li>
                      ))}
                    </ol>
                  ) : (
                    <span className="muted">없음</span>
                  )}
                </dd>
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
                {decoratedGuide.map((item, idx) =>
                  item.type === "segment" ? (
                    <li key={`segment-${idx}`} className="guide-segment">
                      <span>{item.label}</span>
                    </li>
                  ) : (
                    <li key={`guide-${item.key}`}>
                      <p>{item.entry.instructions || "다음 안내"}</p>
                      <small className="muted">
                        {meterToReadable(item.entry.distance)} · {msToReadable(item.entry.duration)}
                      </small>
                    </li>
                  )
                )}
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
