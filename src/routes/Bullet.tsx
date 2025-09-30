import { useEffect, useMemo, useReducer, useState } from "react";
import type { CSSProperties } from "react";

type Coordinates = { lat: number; lon: number };
type Place = Coordinates & {
  id: string;
  name: string;
  city: string;
  keywords?: string[];
};
type Station = Coordinates & {
  id: string;
  name: string;
  city: string;
  lines: string[];
};
type Terminal = Coordinates & {
  id: string;
  name: string;
  city: string;
  grade: "프리미엄" | "우등";
};
type Segment = {
  id: string;
  from: string;
  to: string;
  mode: string;
  minutes: number;
  description: string;
};
type TravelOption = {
  id: string;
  type: "bullet" | "coach";
  label: string;
  provider: string;
  totalMinutes: number;
  summaryPath: string;
  segments: Segment[];
  meta: Record<string, string>;
};
type OptionSnapshot = {
  id: string;
  label: string;
  provider: string;
  totalMinutes: number;
  summaryPath: string;
  segments: Segment[];
  meta: Record<string, string>;
  savedAt: string;
};

type PlanState = {
  start: Place | null;
  end: Place | null;
  selectedOption: OptionSnapshot | null;
};

type PlanAction =
  | { type: "setStart"; payload: Place | null }
  | { type: "setEnd"; payload: Place | null }
  | { type: "selectOption"; payload: OptionSnapshot | null };

type BulletCorridor = {
  id: string;
  label: string;
  line: string;
  fromStations: string[];
  toStations: string[];
  minutes: number;
  bufferMinutes: number;
  frequency: string;
};

type CoachRoute = {
  id: string;
  label: string;
  mode: string;
  fromTerminals: string[];
  toTerminals: string[];
  minutes: number;
  bufferMinutes: number;
  frequency: string;
  grade: "프리미엄" | "우등";
};

const CITY_POINTS: Place[] = [
  { id: "seoul-city", name: "서울 시청", city: "서울", lat: 37.5665, lon: 126.978 },
  { id: "gangnam", name: "서울 강남", city: "서울", lat: 37.4979, lon: 127.0276 },
  { id: "incheon", name: "인천 송도", city: "인천", lat: 37.3826, lon: 126.6564 },
  { id: "suwon", name: "경기 수원", city: "수원", lat: 37.2636, lon: 127.0286 },
  { id: "cheongju", name: "충북 청주", city: "청주", lat: 36.6424, lon: 127.489 },
  { id: "daejeon", name: "대전 시청", city: "대전", lat: 36.3504, lon: 127.3845 },
  { id: "daegu", name: "대구 동성로", city: "대구", lat: 35.8694, lon: 128.6018 },
  { id: "ulsan", name: "울산 삼산", city: "울산", lat: 35.5384, lon: 129.3114 },
  { id: "busan", name: "부산 서면", city: "부산", lat: 35.1577, lon: 129.0595 },
  { id: "gwangju", name: "광주 상무", city: "광주", lat: 35.153, lon: 126.8531 },
  { id: "jeonju", name: "전주 한옥마을", city: "전주", lat: 35.814, lon: 127.1507 },
  { id: "gangneung", name: "강릉 경포", city: "강릉", lat: 37.7997, lon: 128.8961 },
];

const BULLET_STATIONS: Station[] = [
  { id: "seoul", name: "서울역", city: "서울", lat: 37.554648, lon: 126.970607, lines: ["KTX", "ITX"] },
  { id: "suseo", name: "수서역", city: "서울", lat: 37.487224, lon: 127.101281, lines: ["SRT"] },
  { id: "gwangmyeong", name: "광명역", city: "광명", lat: 37.416021, lon: 126.884986, lines: ["KTX"] },
  { id: "cheonan", name: "천안아산역", city: "천안", lat: 36.79445, lon: 127.10489, lines: ["KTX", "SRT"] },
  { id: "daejeon", name: "대전역", city: "대전", lat: 36.33193, lon: 127.43422, lines: ["KTX"] },
  { id: "dongdaegu", name: "동대구역", city: "대구", lat: 35.877437, lon: 128.628749, lines: ["KTX", "SRT"] },
  { id: "ulsan", name: "울산역", city: "울산", lat: 35.551147, lon: 129.138003, lines: ["KTX"] },
  { id: "busan", name: "부산역", city: "부산", lat: 35.115111, lon: 129.041046, lines: ["KTX", "SRT"] },
  { id: "gwangju", name: "광주송정역", city: "광주", lat: 35.137922, lon: 126.792955, lines: ["KTX", "SRT"] },
  { id: "jeonju", name: "전주역", city: "전주", lat: 35.848362, lon: 127.147611, lines: ["KTX"] },
  { id: "cheongnyangni", name: "청량리역", city: "서울", lat: 37.580178, lon: 127.047191, lines: ["KTX-이음"] },
  { id: "gangneung", name: "강릉역", city: "강릉", lat: 37.764008, lon: 128.899681, lines: ["KTX-이음"] },
];

const PREMIUM_TERMINALS: Terminal[] = [
  { id: "seoul-exp", name: "서울고속버스터미널", city: "서울", lat: 37.5041, lon: 127.0043, grade: "프리미엄" },
  { id: "dongseoul", name: "동서울종합터미널", city: "서울", lat: 37.537375, lon: 127.094199, grade: "우등" },
  { id: "incheon-term", name: "인천종합터미널", city: "인천", lat: 37.4413, lon: 126.7017, grade: "우등" },
  { id: "daejeon-term", name: "대전복합터미널", city: "대전", lat: 36.350697, lon: 127.45475, grade: "프리미엄" },
  { id: "daegu-term", name: "동대구터미널", city: "대구", lat: 35.879965, lon: 128.628014, grade: "프리미엄" },
  { id: "busan-term", name: "부산종합버스터미널", city: "부산", lat: 35.162874, lon: 129.059653, grade: "프리미엄" },
  { id: "gwangju-term", name: "광주종합버스터미널", city: "광주", lat: 35.1602, lon: 126.8786, grade: "우등" },
  { id: "jeonju-term", name: "전주고속버스터미널", city: "전주", lat: 35.832121, lon: 127.149259, grade: "우등" },
  { id: "gangneung-term", name: "강릉고속버스터미널", city: "강릉", lat: 37.7724, lon: 128.9072, grade: "우등" },
];

const BULLET_CORRIDORS: BulletCorridor[] = [
  {
    id: "ktx-seoul-busan",
    label: "KTX 경부선 (서울↔부산)",
    line: "KTX",
    fromStations: ["seoul", "gwangmyeong"],
    toStations: ["busan", "dongdaegu", "ulsan"],
    minutes: 155,
    bufferMinutes: 15,
    frequency: "30분 간격",
  },
  {
    id: "srt-suseo-busan",
    label: "SRT 경부선 (수서↔부산)",
    line: "SRT",
    fromStations: ["suseo"],
    toStations: ["busan", "dongdaegu", "ulsan"],
    minutes: 153,
    bufferMinutes: 15,
    frequency: "40분 간격",
  },
  {
    id: "ktx-seoul-gwangju",
    label: "KTX 호남선 (서울↔광주송정)",
    line: "KTX",
    fromStations: ["seoul", "gwangmyeong"],
    toStations: ["gwangju"],
    minutes: 115,
    bufferMinutes: 12,
    frequency: "1시간 간격",
  },
  {
    id: "srt-suseo-gwangju",
    label: "SRT 호남선 (수서↔광주송정)",
    line: "SRT",
    fromStations: ["suseo"],
    toStations: ["gwangju"],
    minutes: 120,
    bufferMinutes: 12,
    frequency: "1시간 간격",
  },
  {
    id: "ktx-seoul-jeonju",
    label: "KTX 전라선 (서울↔전주)",
    line: "KTX",
    fromStations: ["seoul", "gwangmyeong"],
    toStations: ["jeonju"],
    minutes: 110,
    bufferMinutes: 12,
    frequency: "1일 10회",
  },
  {
    id: "ktx-seoul-gangneung",
    label: "KTX-이음 강릉선 (청량리↔강릉)",
    line: "KTX-이음",
    fromStations: ["cheongnyangni"],
    toStations: ["gangneung"],
    minutes: 128,
    bufferMinutes: 15,
    frequency: "1시간 간격",
  },
  {
    id: "ktx-daejeon-busan",
    label: "KTX 경부선 (대전↔부산)",
    line: "KTX",
    fromStations: ["daejeon"],
    toStations: ["busan", "dongdaegu"],
    minutes: 110,
    bufferMinutes: 10,
    frequency: "1시간 간격",
  },
  {
    id: "ktx-daejeon-seoul",
    label: "KTX 경부선 (대전↔서울)",
    line: "KTX",
    fromStations: ["daejeon"],
    toStations: ["seoul", "gwangmyeong"],
    minutes: 55,
    bufferMinutes: 10,
    frequency: "30분 간격",
  },
  {
    id: "ktx-daegu-seoul",
    label: "KTX 경부선 (동대구↔서울)",
    line: "KTX",
    fromStations: ["dongdaegu"],
    toStations: ["seoul", "gwangmyeong"],
    minutes: 110,
    bufferMinutes: 10,
    frequency: "30분 간격",
  },
  {
    id: "ktx-daegu-busan",
    label: "KTX 경부선 (동대구↔부산)",
    line: "KTX",
    fromStations: ["dongdaegu"],
    toStations: ["busan"],
    minutes: 50,
    bufferMinutes: 8,
    frequency: "40분 간격",
  },
];

const COACH_ROUTES: CoachRoute[] = [
  {
    id: "coach-seoul-busan",
    label: "프리미엄 고속 (서울↔부산)",
    mode: "프리미엄 고속버스",
    fromTerminals: ["seoul-exp", "dongseoul"],
    toTerminals: ["busan-term"],
    minutes: 260,
    bufferMinutes: 8,
    frequency: "30분 간격",
    grade: "프리미엄",
  },
  {
    id: "coach-seoul-gwangju",
    label: "우등 고속 (서울↔광주)",
    mode: "우등 고속버스",
    fromTerminals: ["seoul-exp", "dongseoul"],
    toTerminals: ["gwangju-term"],
    minutes: 210,
    bufferMinutes: 8,
    frequency: "40분 간격",
    grade: "우등",
  },
  {
    id: "coach-seoul-daegu",
    label: "프리미엄 고속 (서울↔대구)",
    mode: "프리미엄 고속버스",
    fromTerminals: ["seoul-exp", "dongseoul"],
    toTerminals: ["daegu-term"],
    minutes: 220,
    bufferMinutes: 8,
    frequency: "1시간 간격",
    grade: "프리미엄",
  },
  {
    id: "coach-seoul-gangneung",
    label: "우등 고속 (서울↔강릉)",
    mode: "우등 고속버스",
    fromTerminals: ["dongseoul"],
    toTerminals: ["gangneung-term"],
    minutes: 170,
    bufferMinutes: 8,
    frequency: "1시간 간격",
    grade: "우등",
  },
  {
    id: "coach-seoul-jeonju",
    label: "프리미엄 고속 (서울↔전주)",
    mode: "프리미엄 고속버스",
    fromTerminals: ["seoul-exp", "dongseoul"],
    toTerminals: ["jeonju-term"],
    minutes: 180,
    bufferMinutes: 8,
    frequency: "1일 14회",
    grade: "프리미엄",
  },
];

const PLACE_BY_ID = new Map(CITY_POINTS.map((place) => [place.id, place] as const));
const STATION_BY_ID = new Map(BULLET_STATIONS.map((station) => [station.id, station] as const));
const TERMINAL_BY_ID = new Map(PREMIUM_TERMINALS.map((terminal) => [terminal.id, terminal] as const));

const STORAGE_KEY = "bullet-plan-state";
const DEFAULT_PLAN: PlanState = { start: null, end: null, selectedOption: null };

const toRad = (value: number) => (value * Math.PI) / 180;

function haversine(a: Coordinates, b: Coordinates) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function describeDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function estimateUrbanTravelMinutes(distanceKm: number, profile: "rail" | "coach") {
  const speed = profile === "rail" ? 28 : 25; // km/h
  const minutes = (distanceKm / speed) * 60;
  return Math.max(7, minutes);
}

function findNearest<T extends Coordinates>(
  list: T[],
  target: Coordinates
): { item: T; distance: number } | null {
  if (!list.length) return null;
  let best = list[0];
  let bestDistance = haversine(target, best);
  for (let i = 1; i < list.length; i += 1) {
    const candidate = list[i];
    const d = haversine(target, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return { item: best, distance: bestDistance };
}

function nearestStationFromIds(ids: string[], place: Place) {
  const stations = ids
    .map((id) => STATION_BY_ID.get(id))
    .filter((station): station is Station => Boolean(station));
  const result = findNearest(stations, place);
  return result ? { ...result, station: result.item } : null;
}

function nearestTerminalFromIds(ids: string[], place: Place) {
  const terminals = ids
    .map((id) => TERMINAL_BY_ID.get(id))
    .filter((terminal): terminal is Terminal => Boolean(terminal));
  const result = findNearest(terminals, place);
  return result ? { ...result, terminal: result.item } : null;
}

const planReducer = (state: PlanState, action: PlanAction): PlanState => {
  switch (action.type) {
    case "setStart":
      return { ...state, start: action.payload, selectedOption: null };
    case "setEnd":
      return { ...state, end: action.payload, selectedOption: null };
    case "selectOption":
      return { ...state, selectedOption: action.payload };
    default:
      return state;
  }
};

const initPlanState = (): PlanState => {
  if (typeof window === "undefined") return DEFAULT_PLAN;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAN;
    const parsed = JSON.parse(raw) as {
      startId: string | null;
      endId: string | null;
      selectedOption: OptionSnapshot | null;
    } | null;
    if (!parsed) return DEFAULT_PLAN;
    const start = parsed.startId ? PLACE_BY_ID.get(parsed.startId) || null : null;
    const end = parsed.endId ? PLACE_BY_ID.get(parsed.endId) || null : null;
    return {
      start,
      end,
      selectedOption: parsed.selectedOption,
    };
  } catch (error) {
    console.warn("failed to restore bullet plan", error);
    return DEFAULT_PLAN;
  }
};

function persistPlan(state: PlanState) {
  if (typeof window === "undefined") return;
  const serializable = {
    startId: state.start?.id ?? null,
    endId: state.end?.id ?? null,
    selectedOption: state.selectedOption,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

type LocationPickerProps = {
  label: string;
  query: string;
  onQueryChange: (value: string) => void;
  selected: Place | null;
  onSelect: (place: Place) => void;
  onClear: () => void;
};

const suggestionBoxStyle: CSSProperties = {
  border: "1px solid #d4d4d8",
  borderRadius: 8,
  marginTop: 4,
  padding: 4,
  backgroundColor: "#fff",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
};

const suggestionButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

function LocationPicker({
  label,
  query,
  onQueryChange,
  selected,
  onSelect,
  onClear,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return CITY_POINTS.slice(0, 6);
    const normalized = keyword.toLowerCase();
    return CITY_POINTS.filter((place) => {
      const haystack = [place.name, place.city, ...(place.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    }).slice(0, 6);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      if (!query.trim()) setOpen(false);
    }, 10000);
    return () => clearTimeout(handle);
  }, [open, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="지역이나 랜드마크를 입력하세요"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5f5" }}
        />
        <button type="button" onClick={onClear} style={{ padding: "8px 12px" }}>
          초기화
        </button>
      </div>
      {selected && (
        <span style={{ fontSize: 12, color: "#475569" }}>
          선택된 위치: {selected.name} ({selected.city})
        </span>
      )}
      {open && suggestions.length > 0 && (
        <div style={suggestionBoxStyle}>
          {suggestions.map((place) => {
            const isActive = selected?.id === place.id;
            return (
              <button
                type="button"
                key={place.id}
                style={{
                  ...suggestionButtonStyle,
                  backgroundColor: isActive ? "#e0f2fe" : "transparent",
                  color: isActive ? "#0369a1" : "inherit",
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(place);
                  onQueryChange(place.name);
                  setOpen(false);
                }}
              >
                <strong>{place.name}</strong>
                <br />
                <span style={{ fontSize: 12, color: "#64748b" }}>{place.city}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildBulletOption(corridor: BulletCorridor, start: Place, end: Place): TravelOption | null {
  const startCandidate = nearestStationFromIds(corridor.fromStations, start);
  const endCandidate = nearestStationFromIds(corridor.toStations, end);
  if (!startCandidate || !endCandidate) return null;
  const firstMile = estimateUrbanTravelMinutes(startCandidate.distance, "rail");
  const lastMile = estimateUrbanTravelMinutes(endCandidate.distance, "rail");
  const totalMinutes = Math.round(firstMile + corridor.minutes + lastMile + corridor.bufferMinutes);
  const segments: Segment[] = [
    {
      id: `${corridor.id}-first`,
      from: start.name,
      to: startCandidate.station.name,
      mode: "도심 이동",
      minutes: Math.round(firstMile),
      description: `${start.name} → ${startCandidate.station.name} (${describeDistance(
        startCandidate.distance
      )})`,
    },
    {
      id: `${corridor.id}-main`,
      from: startCandidate.station.name,
      to: endCandidate.station.name,
      mode: corridor.line,
      minutes: corridor.minutes,
      description: `${corridor.line} 운행 ${startCandidate.station.name} → ${endCandidate.station.name}`,
    },
    {
      id: `${corridor.id}-last`,
      from: endCandidate.station.name,
      to: end.name,
      mode: "도심 이동",
      minutes: Math.round(lastMile),
      description: `${endCandidate.station.name} → ${end.name} (${describeDistance(endCandidate.distance)})`,
    },
  ];
  const summaryPath = `${start.name} → ${startCandidate.station.name} → ${endCandidate.station.name} → ${end.name}`;
  const meta: Record<string, string> = {
    배차간격: corridor.frequency,
    여유시간: `${corridor.bufferMinutes}분 대기`,
  };
  return {
    id: corridor.id,
    type: "bullet",
    label: corridor.label,
    provider: corridor.line,
    totalMinutes,
    segments,
    summaryPath,
    meta,
  };
}

function buildCoachOption(route: CoachRoute, start: Place, end: Place): TravelOption | null {
  const startCandidate = nearestTerminalFromIds(route.fromTerminals, start);
  const endCandidate = nearestTerminalFromIds(route.toTerminals, end);
  if (!startCandidate || !endCandidate) return null;
  const firstMile = estimateUrbanTravelMinutes(startCandidate.distance, "coach");
  const lastMile = estimateUrbanTravelMinutes(endCandidate.distance, "coach");
  const totalMinutes = Math.round(firstMile + route.minutes + lastMile + route.bufferMinutes);
  const segments: Segment[] = [
    {
      id: `${route.id}-first`,
      from: start.name,
      to: startCandidate.terminal.name,
      mode: "도심 이동",
      minutes: Math.round(firstMile),
      description: `${start.name} → ${startCandidate.terminal.name} (${describeDistance(
        startCandidate.distance
      )})`,
    },
    {
      id: `${route.id}-main`,
      from: startCandidate.terminal.name,
      to: endCandidate.terminal.name,
      mode: route.mode,
      minutes: route.minutes,
      description: `${route.mode} ${startCandidate.terminal.name} → ${endCandidate.terminal.name}`,
    },
    {
      id: `${route.id}-last`,
      from: endCandidate.terminal.name,
      to: end.name,
      mode: "도심 이동",
      minutes: Math.round(lastMile),
      description: `${endCandidate.terminal.name} → ${end.name} (${describeDistance(endCandidate.distance)})`,
    },
  ];
  const summaryPath = `${start.name} → ${startCandidate.terminal.name} → ${endCandidate.terminal.name} → ${end.name}`;
  const meta: Record<string, string> = {
    배차간격: route.frequency,
    차량등급: route.grade,
    여유시간: `${route.bufferMinutes}분 대기`,
  };
  return {
    id: route.id,
    type: "coach",
    label: route.label,
    provider: route.mode,
    totalMinutes,
    segments,
    summaryPath,
    meta,
  };
}

function createSnapshot(option: TravelOption): OptionSnapshot {
  return {
    id: option.id,
    label: option.label,
    provider: option.provider,
    totalMinutes: option.totalMinutes,
    summaryPath: option.summaryPath,
    segments: option.segments,
    meta: option.meta,
    savedAt: new Date().toISOString(),
  };
}

const sectionStyle: CSSProperties = {
  marginTop: 24,
  padding: 16,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  boxShadow: "0 6px 20px rgba(15,23,42,0.05)",
};

const optionCardStyle: CSSProperties = {
  border: "1px solid #cbd5f5",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "linear-gradient(135deg, rgba(239,246,255,0.8), #ffffff)",
};

const optionCardSelected: CSSProperties = {
  ...optionCardStyle,
  border: "2px solid #2563eb",
  boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
};

const summaryCardStyle: CSSProperties = {
  ...sectionStyle,
  borderColor: "#2563eb",
  background: "linear-gradient(120deg, rgba(219,234,254,0.7), rgba(255,255,255,0.95))",
};

export default function BulletPlanner() {
  const [planState, dispatch] = useReducer(planReducer, DEFAULT_PLAN, initPlanState);
  const [startQuery, setStartQuery] = useState(planState.start?.name ?? "");
  const [endQuery, setEndQuery] = useState(planState.end?.name ?? "");

  useEffect(() => {
    persistPlan(planState);
  }, [planState]);

  useEffect(() => {
    setStartQuery(planState.start?.name ?? "");
  }, [planState.start]);

  useEffect(() => {
    setEndQuery(planState.end?.name ?? "");
  }, [planState.end]);

  const startNearestStation = useMemo(() => {
    if (!planState.start) return null;
    const result = findNearest(BULLET_STATIONS, planState.start);
    return result
      ? {
          station: result.item,
          distance: result.distance,
        }
      : null;
  }, [planState.start]);

  const startNearestTerminal = useMemo(() => {
    if (!planState.start) return null;
    const result = findNearest(PREMIUM_TERMINALS, planState.start);
    return result
      ? {
          terminal: result.item,
          distance: result.distance,
        }
      : null;
  }, [planState.start]);

  const endNearestStation = useMemo(() => {
    if (!planState.end) return null;
    const result = findNearest(BULLET_STATIONS, planState.end);
    return result
      ? {
          station: result.item,
          distance: result.distance,
        }
      : null;
  }, [planState.end]);

  const endNearestTerminal = useMemo(() => {
    if (!planState.end) return null;
    const result = findNearest(PREMIUM_TERMINALS, planState.end);
    return result
      ? {
          terminal: result.item,
          distance: result.distance,
        }
      : null;
  }, [planState.end]);

  const travelOptions = useMemo(() => {
    const { start, end } = planState;
    if (!start || !end) return [] as TravelOption[];
    const bullet = BULLET_CORRIDORS.map((corridor) =>
      buildBulletOption(corridor, start, end)
    ).filter((option): option is TravelOption => Boolean(option));
    const coach = COACH_ROUTES.map((route) =>
      buildCoachOption(route, start, end)
    ).filter((option): option is TravelOption => Boolean(option));
    return [...bullet, ...coach].sort((a, b) => a.totalMinutes - b.totalMinutes);
  }, [planState.start, planState.end]);

  const hasBothLocations = Boolean(planState.start && planState.end);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 24 }}>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>🚄 총알 환승 플래너</h1>
        <p style={{ color: "#475569", marginTop: 8 }}>
          출발지와 도착지를 선택하면 가장 가까운 철도역·고속터미널과 연결 가능한 후보 노선을 추천해 드립니다.
        </p>
      </header>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>1. 출발·도착지 입력</h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <LocationPicker
            label="출발지"
            query={startQuery}
            onQueryChange={setStartQuery}
            selected={planState.start}
            onSelect={(place) => dispatch({ type: "setStart", payload: place })}
            onClear={() => dispatch({ type: "setStart", payload: null })}
          />
          <LocationPicker
            label="도착지"
            query={endQuery}
            onQueryChange={setEndQuery}
            selected={planState.end}
            onSelect={(place) => dispatch({ type: "setEnd", payload: place })}
            onClear={() => dispatch({ type: "setEnd", payload: null })}
          />
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
          🔎 제안 목록에 없는 위치는 가까운 도시 중심지를 선택한 뒤 세부 주소를 메모해 두세요.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>2. 주변 환승 거점 탐색</h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>출발 측</h3>
            {planState.start ? (
              <ul style={{ margin: 0, paddingLeft: 16, color: "#1e293b" }}>
                {startNearestStation && (
                  <li>
                    철도: {startNearestStation.station.name} ({describeDistance(startNearestStation.distance)})
                  </li>
                )}
                {startNearestTerminal && (
                  <li>
                    고속버스: {startNearestTerminal.terminal.name} ({describeDistance(startNearestTerminal.distance)})
                  </li>
                )}
              </ul>
            ) : (
              <p style={{ color: "#94a3b8" }}>출발지를 선택하면 자동으로 계산됩니다.</p>
            )}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>도착 측</h3>
            {planState.end ? (
              <ul style={{ margin: 0, paddingLeft: 16, color: "#1e293b" }}>
                {endNearestStation && (
                  <li>
                    철도: {endNearestStation.station.name} ({describeDistance(endNearestStation.distance)})
                  </li>
                )}
                {endNearestTerminal && (
                  <li>
                    고속버스: {endNearestTerminal.terminal.name} ({describeDistance(endNearestTerminal.distance)})
                  </li>
                )}
              </ul>
            ) : (
              <p style={{ color: "#94a3b8" }}>도착지를 선택하면 자동으로 계산됩니다.</p>
            )}
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>3. 후보 교통수단 비교</h2>
        {!hasBothLocations ? (
          <p style={{ color: "#94a3b8" }}>출발지와 도착지를 모두 선택하면 이동 후보가 표시됩니다.</p>
        ) : travelOptions.length === 0 ? (
          <p style={{ color: "#ef4444" }}>해당 구간을 위한 등록된 후보 노선을 찾을 수 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {travelOptions.map((option) => {
              const isSelected = planState.selectedOption?.id === option.id;
              return (
                <article
                  key={option.id}
                  style={isSelected ? optionCardSelected : optionCardStyle}
                  aria-pressed={isSelected}
                >
                  <header>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{option.label}</h3>
                    <p style={{ margin: 0, color: "#475569" }}>{option.provider}</p>
                  </header>
                  <p style={{ fontWeight: 600, color: "#0f172a" }}>
                    예상 소요 시간: 약 {option.totalMinutes}분
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#1e293b" }}>
                    {option.segments.map((segment) => (
                      <li key={segment.id} style={{ fontSize: 13 }}>
                        <strong>{segment.mode}</strong> · {segment.description} · {segment.minutes}분
                      </li>
                    ))}
                  </ul>
                  <dl style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
                    {Object.entries(option.meta).map(([key, value]) => (
                      <div key={key} style={{ display: "flex", gap: 6 }}>
                        <dt style={{ fontWeight: 600 }}>{key}</dt>
                        <dd style={{ margin: 0 }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "selectOption", payload: createSnapshot(option) })}
                    style={{
                      marginTop: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      backgroundColor: isSelected ? "#2563eb" : "#1d4ed8",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {isSelected ? "선택됨" : "이 경로 선택"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {planState.selectedOption && (
        <section style={summaryCardStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>4. 선택한 구간 요약</h2>
          <p style={{ color: "#1e293b", fontWeight: 600 }}>{planState.selectedOption.label}</p>
          <p style={{ color: "#0f172a" }}>경로: {planState.selectedOption.summaryPath}</p>
          <p style={{ color: "#0f172a", fontWeight: 600 }}>
            총 예상 소요 시간: 약 {planState.selectedOption.totalMinutes}분
          </p>
          <ol style={{ margin: "12px 0", paddingLeft: 20, color: "#1e293b" }}>
            {planState.selectedOption.segments.map((segment) => (
              <li key={segment.id} style={{ marginBottom: 6 }}>
                <strong>{segment.from}</strong> → <strong>{segment.to}</strong> ({segment.mode}, {segment.minutes}분)
              </li>
            ))}
          </ol>
          <div style={{ fontSize: 12, color: "#475569" }}>
            <p style={{ margin: 0 }}>세션 스토리지에 선택한 옵션이 저장되어 다른 화면에서도 이어서 사용할 수 있습니다.</p>
            <p style={{ margin: 0 }}>필요 시 라우팅 시나리오에 맞춰 planState를 Context로 끌어올려 공유하도록 설계했습니다.</p>
          </div>
        </section>
      )}
    </div>
  );
}
