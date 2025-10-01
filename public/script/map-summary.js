const savedTheme = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("theme") : null;
const prefersDark = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
const activeTheme = savedTheme ?? (prefersDark ? "dark" : "light");
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", activeTheme);
}

const meterToReadable = (m) => {
  if (!m && m !== 0) return "-";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
};

const msToReadable = (ms) => {
  if (!ms && ms !== 0) return "-";
  const totalSec = Math.round(ms / 1000);
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
  if (!n && n !== 0) return "-";
  return `${Math.round(n).toLocaleString()}원`;
};

const selectAll = (selector) => Array.from(document.querySelectorAll(selector));
const updateText = (key, value) => {
  const targets = new Set([
    ...selectAll(`[data-field="${key}"]`),
    ...selectAll(`#${key}`)
  ]);
  targets.forEach((el) => {
    if (el) {
      el.textContent = value;
    }
  });
};

const showElement = (el, visible) => {
  if (!el) return;
  if (visible) {
    el.removeAttribute("hidden");
    el.classList.remove("hidden");
  } else {
    el.setAttribute("hidden", "hidden");
    el.classList.add("hidden");
  }
};

const label = (addr) => {
  if (!addr) return "-";
  return addr.roadAddress || addr.jibunAddress || `${addr.y}, ${addr.x}`;
};

const createGuideItem = (guide) => {
  const li = document.createElement("li");
  const primary = document.createElement("p");
  primary.textContent = guide.instructions || "다음 안내";
  li.append(primary);

  const secondary = document.createElement("small");
  secondary.className = "muted";
  secondary.textContent = `${meterToReadable(guide.distance)} · ${msToReadable(guide.duration)}`;
  li.append(secondary);
  return li;
};

const createGuideSegmentItem = (label) => {
  const li = document.createElement("li");
  li.className = "guide-segment";
  const span = document.createElement("span");
  span.textContent = label;
  li.append(span);
  return li;
};

const parseStoredRoute = () => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const storage = window.localStorage;
  const routeRaw = storage.getItem("route");
  const startRaw = storage.getItem("start");
  const endRaw = storage.getItem("end");

  if (routeRaw) {
    try {
      const parsed = JSON.parse(routeRaw);
      if (parsed?.start && parsed?.end) {
        return {
          start: parsed.start,
          end: parsed.end,
          waypoints: Array.isArray(parsed.waypoints) ? parsed.waypoints.filter(Boolean) : []
        };
      }
    } catch (err) {
      console.error("Failed to parse stored route", err);
    }
  }

  if (startRaw && endRaw) {
    try {
      return {
        start: JSON.parse(startRaw),
        end: JSON.parse(endRaw),
        waypoints: []
      };
    } catch (err) {
      console.error("Failed to parse fallback route", err);
    }
  }

  return null;
};

const waypointQueryValue = (waypoints) =>
  waypoints
    .filter((wp) => wp && typeof wp.x === "string" && typeof wp.y === "string")
    .map((wp) => `${wp.x},${wp.y}`)
    .join("|");

const buildSegmentTitles = (start, waypoints, end) => {
  const points = [start, ...waypoints, end].filter(Boolean);
  const titles = [];
  const nameForIndex = (index) => {
    if (index === 0) return "출발지";
    if (index === points.length - 1) return "도착지";
    return `경유지 ${index}`;
  };
  for (let i = 0; i < points.length - 1; i += 1) {
    titles.push(`${nameForIndex(i)} → ${nameForIndex(i + 1)}`);
  }
  return titles;
};

const decorateGuide = (guide, segmentTitles, waypointCount) => {
  if (!Array.isArray(guide) || !guide.length) return [];

  const items = [];
  if (segmentTitles[0]) {
    items.push({ type: "segment", label: segmentTitles[0] });
  }

  let currentSegment = 0;
  let waypointHitCount = 0;

  const isWaypointArrival = (entry) => {
    if (waypointHitCount >= waypointCount) return false;
    if (typeof entry?.type === "number" && entry.type === 3) return true;
    const normalized = typeof entry?.instructions === "string" ? entry.instructions.replace(/\s+/g, "") : "";
    if (!normalized) return false;
    return /경유지|경유|passpoint|waypoint|중간지점/i.test(normalized);
  };

  guide.forEach((entry) => {
    items.push({ type: "entry", entry });

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
};

async function initialise() {
  const container = document.querySelector("[data-role='container']") || document.body;
  const loadingEl = document.querySelector("[data-role='loading']");
  const errorEl = document.querySelector("[data-role='error']");
  const guideList = document.querySelector("[data-role='guide']");
  const summarySection = document.querySelector("[data-role='summary']");
  const mapSection = document.querySelector("[data-role='map-section']");
  const mapImg = document.querySelector("[data-role='map-preview']");
  const waypointList = document.querySelector("[data-role='waypoints']");
  const waypointEmpty = document.querySelector("[data-role='waypoints-empty']");

  container.classList.remove("state-error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  const storedRoute = parseStoredRoute();

  if (!storedRoute) {
    if (errorEl) {
      errorEl.textContent = "저장된 경로 정보가 없습니다. 특송 경로 계산 화면에서 경로를 먼저 계산해주세요.";
      showElement(errorEl, true);
    }
    showElement(loadingEl, false);
    showElement(summarySection, false);
    showElement(mapSection, false);
    showElement(guideList?.closest("section"), false);
    showElement(waypointList, false);
    showElement(waypointEmpty, false);
    container.classList.add("state-error");
    return;
  }

  try {
    const parsedStart = storedRoute.start;
    const parsedEnd = storedRoute.end;
    const parsedWaypoints = Array.isArray(storedRoute.waypoints) ? storedRoute.waypoints : [];
    updateText("start", label(parsedStart));
    updateText("end", label(parsedEnd));

    if (parsedWaypoints.length && waypointList) {
      waypointList.innerHTML = "";
      parsedWaypoints.forEach((wp, idx) => {
        const li = document.createElement("li");
        li.textContent = `${idx + 1}. ${label(wp)}`;
        waypointList.append(li);
      });
      showElement(waypointList, true);
      showElement(waypointEmpty, false);
    } else {
      if (waypointList) {
        waypointList.innerHTML = "";
      }
      showElement(waypointList, false);
      showElement(waypointEmpty, true);
    }

    const params = new URLSearchParams({
      startX: parsedStart.x,
      startY: parsedStart.y,
      endX: parsedEnd.x,
      endY: parsedEnd.y
    });

    if (parsedWaypoints.length) {
      params.set("waypoints", waypointQueryValue(parsedWaypoints));
    }

    if (mapImg) {
      mapImg.src = `/api/static-map?${params.toString()}`;
      mapImg.alt = "경로 미리보기 지도";
      showElement(mapSection, true);
    }

    try {
      const res = await fetch(`/api/directions?${params.toString()}`);
      if (!res.ok) {
        throw new Error("경로 정보를 불러오지 못했습니다.");
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const trafast = data.route?.trafast?.[0];
      if (!trafast || !trafast.summary) {
        throw new Error(data.message || "경로 요약 데이터를 찾을 수 없습니다.");
      }

      const summary = trafast.summary;
      updateText("distance", meterToReadable(summary.distance));
      updateText("duration", msToReadable(summary.duration));

      const taxiRow = document.querySelector("[data-field-section='taxiFare']");
      if (summary.taxiFare !== undefined) {
        updateText("taxiFare", formatCurrency(summary.taxiFare));
        showElement(taxiRow, true);
      } else {
        showElement(taxiRow, false);
      }

      const fuelRow = document.querySelector("[data-field-section='fuelPrice']");
      if (summary.fuelPrice !== undefined) {
        updateText("fuelPrice", formatCurrency(summary.fuelPrice));
        showElement(fuelRow, true);
      } else {
        showElement(fuelRow, false);
      }

      const segmentTitles = buildSegmentTitles(parsedStart, parsedWaypoints, parsedEnd);
      const decoratedGuide = decorateGuide(trafast.guide, segmentTitles, parsedWaypoints.length);

      if (decoratedGuide.length && guideList) {
        guideList.innerHTML = "";
        decoratedGuide.forEach((item) => {
          if (item.type === "segment") {
            guideList.append(createGuideSegmentItem(item.label));
          } else {
            guideList.append(createGuideItem(item.entry));
          }
        });
        showElement(guideList.closest("section"), true);
      } else if (guideList) {
        guideList.innerHTML = "";
        showElement(guideList.closest("section"), false);
      }

      showElement(summarySection, true);
    } catch (err) {
      console.error(err);
      if (errorEl) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        errorEl.textContent = message;
        showElement(errorEl, true);
      }
      showElement(summarySection, false);
      showElement(guideList?.closest("section"), false);
      showElement(mapSection, !!mapImg?.src);
      container.classList.add("state-error");
    }
  } catch (err) {
    console.error(err);
    if (errorEl) {
      errorEl.textContent = "저장된 위치 정보를 해석할 수 없습니다. 다시 경로를 계산해주세요.";
      showElement(errorEl, true);
    }
    showElement(summarySection, false);
    showElement(guideList?.closest("section"), false);
    showElement(mapSection, false);
    container.classList.add("state-error");
  } finally {
    showElement(loadingEl, false);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
