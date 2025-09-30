const meterToReadable = (m) => {
  if (m === undefined || m === null || Number.isNaN(m)) return "-";
  const num = Number(m);
  if (Number.isNaN(num)) return "-";
  if (num >= 1000) return `${(num / 1000).toFixed(1)} km`;
  return `${Math.round(num)} m`;
};

const msToReadable = (ms) => {
  if (ms === undefined || ms === null || Number.isNaN(ms)) return "-";
  const totalSec = Math.round(Number(ms) / 1000);
  if (!Number.isFinite(totalSec)) return "-";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts = [];
  if (hours) parts.push(`${hours}시간`);
  if (minutes) parts.push(`${minutes}분`);
  if (!hours && !minutes) parts.push(`${seconds}초`);
  return parts.join(" ") || "0초";
};

const formatCurrency = (n) => {
  if (n === undefined || n === null || Number.isNaN(n)) return "-";
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return `${Math.round(num).toLocaleString()}원`;
};

const labelOf = (addr) => {
  if (!addr) return "-";
  return addr.roadAddress || addr.jibunAddress || (addr.y && addr.x ? `${addr.y}, ${addr.x}` : "-");
};

const toggleHidden = (el, shouldHide) => {
  if (!el) return;
  el.classList.toggle("hidden", shouldHide);
};

const parseStoredAddr = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!("x" in parsed) || !("y" in parsed)) return null;
    return parsed;
  } catch (err) {
    console.error("Failed to parse stored address", err);
    return null;
  }
};

const readFromStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { start: null, end: null };
  }
  const start = parseStoredAddr(window.localStorage.getItem("start"));
  const end = parseStoredAddr(window.localStorage.getItem("end"));
  return { start, end };
};

const readFromQuery = () => {
  if (typeof window === "undefined") {
    return { start: null, end: null };
  }
  const params = new URLSearchParams(window.location.search);
  const startX = params.get("startX") || params.get("startLng") || params.get("sx");
  const startY = params.get("startY") || params.get("startLat") || params.get("sy");
  const endX = params.get("endX") || params.get("endLng") || params.get("ex");
  const endY = params.get("endY") || params.get("endLat") || params.get("ey");

  const startLabel =
    params.get("startLabel") ||
    params.get("startRoadAddress") ||
    params.get("startAddress") ||
    params.get("startName");
  const endLabel =
    params.get("endLabel") ||
    params.get("endRoadAddress") ||
    params.get("endAddress") ||
    params.get("endName");

  const startJibun = params.get("startJibunAddress") || params.get("startJibun");
  const endJibun = params.get("endJibunAddress") || params.get("endJibun");

  const start = startX && startY ? { x: startX, y: startY } : null;
  const end = endX && endY ? { x: endX, y: endY } : null;

  if (start) {
    if (startLabel) start.roadAddress = startLabel;
    if (startJibun) start.jibunAddress = startJibun;
  }
  if (end) {
    if (endLabel) end.roadAddress = endLabel;
    if (endJibun) end.jibunAddress = endJibun;
  }

  return { start, end };
};

const saveToStorage = (start, end) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (start && start.x && start.y) {
      window.localStorage.setItem("start", JSON.stringify(start));
    }
    if (end && end.x && end.y) {
      window.localStorage.setItem("end", JSON.stringify(end));
    }
  } catch (err) {
    console.warn("Failed to persist route", err);
  }
};

const mergeAddress = (primary, secondary) => {
  if (!primary && !secondary) return null;
  const merged = { ...(secondary || {}), ...(primary || {}) };
  if (!merged.x || !merged.y) return null;
  if (!merged.roadAddress && merged.jibunAddress) {
    merged.roadAddress = merged.jibunAddress;
  }
  return merged;
};

const buildSearchParams = (start, end) => {
  const params = new URLSearchParams();
  params.set("startX", String(start.x));
  params.set("startY", String(start.y));
  params.set("endX", String(end.x));
  params.set("endY", String(end.y));
  return params;
};

const renderBasicInfo = (start, end) => {
  const startLabelEl = document.getElementById("start-label");
  const endLabelEl = document.getElementById("end-label");
  if (startLabelEl) startLabelEl.textContent = labelOf(start);
  if (endLabelEl) endLabelEl.textContent = labelOf(end);
  toggleHidden(document.getElementById("basic-info"), false);
};

const renderSummary = (summary) => {
  if (!summary) {
    toggleHidden(document.getElementById("summary-card"), true);
    return;
  }
  const distanceEl = document.getElementById("summary-distance");
  const durationEl = document.getElementById("summary-duration");
  const taxiWrapper = document.getElementById("summary-taxi");
  const taxiEl = document.getElementById("summary-taxi-fare");
  const fuelWrapper = document.getElementById("summary-fuel");
  const fuelEl = document.getElementById("summary-fuel-price");

  if (distanceEl) distanceEl.textContent = meterToReadable(summary.distance);
  if (durationEl) durationEl.textContent = msToReadable(summary.duration);

  if (summary.taxiFare !== undefined) {
    if (taxiEl) taxiEl.textContent = formatCurrency(summary.taxiFare);
    toggleHidden(taxiWrapper, false);
  } else {
    toggleHidden(taxiWrapper, true);
  }

  if (summary.fuelPrice !== undefined) {
    if (fuelEl) fuelEl.textContent = formatCurrency(summary.fuelPrice);
    toggleHidden(fuelWrapper, false);
  } else {
    toggleHidden(fuelWrapper, true);
  }

  toggleHidden(document.getElementById("summary-card"), false);
};

const renderGuide = (guide = []) => {
  const guideCard = document.getElementById("guide-card");
  const list = document.getElementById("guide-list");
  if (!guideCard || !list) return;

  list.innerHTML = "";
  if (!Array.isArray(guide) || guide.length === 0) {
    toggleHidden(guideCard, true);
    return;
  }

  guide.forEach((item, index) => {
    const li = document.createElement("li");
    const title = document.createElement("p");
    title.textContent = item?.instructions || `다음 안내 (${index + 1})`;
    li.appendChild(title);

    const detail = document.createElement("small");
    detail.className = "muted";
    detail.textContent = `${meterToReadable(item?.distance)} · ${msToReadable(item?.duration)}`;
    li.appendChild(detail);
    list.appendChild(li);
  });

  toggleHidden(guideCard, false);
};

const renderMap = (url) => {
  const card = document.getElementById("map-card");
  const image = document.getElementById("map-image");
  if (!card || !image) return;
  if (!url) {
    toggleHidden(card, true);
    return;
  }
  image.src = url;
  image.alt = "경로 미리보기 지도";
  toggleHidden(card, false);
};

const setLoading = (isLoading) => {
  const loadingEl = document.getElementById("loading-message");
  if (!loadingEl) return;
  toggleHidden(loadingEl, !isLoading);
};

const showError = (message) => {
  const errorEl = document.getElementById("error-message");
  if (!errorEl) return;
  errorEl.textContent = message;
  toggleHidden(errorEl, false);
};

const hideError = () => {
  const errorEl = document.getElementById("error-message");
  if (!errorEl) return;
  toggleHidden(errorEl, true);
  errorEl.textContent = "";
};

const initialise = async () => {
  const root = document.getElementById("map-summary-root");
  if (!root) return;

  setLoading(true);
  hideError();

  const { start: queryStart, end: queryEnd } = readFromQuery();
  const { start: storedStart, end: storedEnd } = readFromStorage();

  const start = mergeAddress(queryStart, storedStart);
  const end = mergeAddress(queryEnd, storedEnd);

  if (!start || !end || !start.x || !start.y || !end.x || !end.y) {
    setLoading(false);
    showError("저장된 출발/도착 정보가 없습니다. 특송 경로 계산 화면에서 경로를 먼저 계산해주세요.");
    return;
  }

  saveToStorage(start, end);

  renderBasicInfo(start, end);

  const params = buildSearchParams(start, end);
  const mapUrl = `/api/static-map?${params.toString()}`;
  renderMap(mapUrl);

  try {
    const res = await fetch(`/api/directions?${params.toString()}`);
    if (!res.ok) {
      throw new Error("경로 정보를 불러오지 못했습니다.");
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    const trafast = data?.route?.trafast?.[0];
    if (!trafast || !trafast.summary) {
      const message = data?.message || "경로 요약 데이터를 찾을 수 없습니다.";
      throw new Error(message);
    }

    renderSummary(trafast.summary);
    renderGuide(Array.isArray(trafast.guide) ? trafast.guide : []);
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(false);
    renderSummary(null);
    renderGuide([]);
    renderMap(mapUrl);
    showError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initialise();
});
