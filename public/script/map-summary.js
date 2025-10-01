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

const STORAGE_KEY = "expressRoute";

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

async function initialise() {
  const container = document.querySelector("[data-role='container']") || document.body;
  const loadingEl = document.querySelector("[data-role='loading']");
  const errorEl = document.querySelector("[data-role='error']");
  const guideList = document.querySelector("[data-role='guide']");
  const summarySection = document.querySelector("[data-role='summary']");
  const mapSection = document.querySelector("[data-role='map-section']");
  const mapImg = document.querySelector("[data-role='map-preview']");

  const storage = window.localStorage;
  const savedRoute = storage ? storage.getItem(STORAGE_KEY) : null;

  container.classList.remove("state-error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  try {
    let parsedRoute = null;
    if (savedRoute) {
      parsedRoute = JSON.parse(savedRoute);
    } else {
      const startRaw = storage?.getItem("start") || null;
      const endRaw = storage?.getItem("end") || null;
      if (startRaw && endRaw) {
        parsedRoute = { start: JSON.parse(startRaw), end: JSON.parse(endRaw), waypoints: [], summary: null };
      }
    }

    if (!parsedRoute?.start || !parsedRoute?.end) {
      throw new Error("저장된 출발/도착 정보가 없습니다. 특송 경로 계산 화면에서 경로를 먼저 계산해주세요.");
    }

    const parsedStart = parsedRoute.start;
    const parsedEnd = parsedRoute.end;
    const parsedWaypoints = Array.isArray(parsedRoute.waypoints) ? parsedRoute.waypoints.filter(Boolean) : [];

    updateText("start", label(parsedStart));
    updateText("end", label(parsedEnd));

    const waypointSection = document.querySelector("[data-field-section='waypoints']");
    const waypointList = document.querySelector("[data-role='waypoints']");
    if (parsedWaypoints.length && waypointList) {
      waypointList.innerHTML = "";
      parsedWaypoints.forEach((wp, idx) => {
        const li = document.createElement("li");
        li.textContent = `경유지 ${idx + 1}: ${label(wp)}`;
        waypointList.append(li);
      });
      showElement(waypointSection, true);
    } else if (waypointSection) {
      waypointList && (waypointList.innerHTML = "");
      showElement(waypointSection, false);
    }

    if (parsedRoute.summary) {
      updateText("distance", meterToReadable(parsedRoute.summary.distance));
      updateText("duration", msToReadable(parsedRoute.summary.duration));
      const taxiRow = document.querySelector("[data-field-section='taxiFare']");
      if (parsedRoute.summary.taxiFare !== undefined) {
        updateText("taxiFare", formatCurrency(parsedRoute.summary.taxiFare));
        showElement(taxiRow, true);
      } else {
        showElement(taxiRow, false);
      }
      const fuelRow = document.querySelector("[data-field-section='fuelPrice']");
      if (parsedRoute.summary.fuelPrice !== undefined) {
        updateText("fuelPrice", formatCurrency(parsedRoute.summary.fuelPrice));
        showElement(fuelRow, true);
      } else {
        showElement(fuelRow, false);
      }
      showElement(summarySection, true);
    }

    const params = new URLSearchParams({
      startX: parsedStart.x,
      startY: parsedStart.y,
      endX: parsedEnd.x,
      endY: parsedEnd.y
    });
    if (parsedWaypoints.length) {
      params.set("waypoints", parsedWaypoints.map((wp) => `${wp.x},${wp.y}`).join("|"));
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

      if (Array.isArray(trafast.guide) && trafast.guide.length && guideList) {
        guideList.innerHTML = "";
        trafast.guide.forEach((guide) => {
          guideList.append(createGuideItem(guide));
        });
        showElement(guideList.closest("section"), true);
      } else if (guideList) {
        guideList.innerHTML = "";
        showElement(guideList.closest("section"), false);
      }

      const updated = { start: parsedStart, end: parsedEnd, waypoints: parsedWaypoints, summary };
      storage?.setItem(STORAGE_KEY, JSON.stringify(updated));

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
      const message = err instanceof Error ? err.message : "저장된 위치 정보를 해석할 수 없습니다. 다시 경로를 계산해주세요.";
      errorEl.textContent = message;
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
