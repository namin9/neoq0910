export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const sx = u.searchParams.get("startX");
    const sy = u.searchParams.get("startY");
    const ex = u.searchParams.get("endX");
    const ey = u.searchParams.get("endY");
    if (!sx || !sy || !ex || !ey) {
      return new Response(JSON.stringify({ error: "Missing coords" }), {
        status: 400, headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const rawWaypoints = u.searchParams.getAll("waypoints");
    const parseWaypointString = (value: string) => {
      const parts = value
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length < 2) return null;
      const lon = Number(parts[0]);
      const lat = Number(parts[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return { lon, lat };
    };

    const toWaypoint = (value: unknown) => {
      if (typeof value === "string") {
        return parseWaypointString(value);
      }
      if (Array.isArray(value)) {
        if (value.length < 2) return null;
        const lon = Number(value[0]);
        const lat = Number(value[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
        return { lon, lat };
      }
      if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const lon = Number(obj.lon ?? obj.x);
        const lat = Number(obj.lat ?? obj.y);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
        return { lon, lat };
      }
      return null;
    };

    const waypointCoords: { lon: number; lat: number }[] = [];
    if (rawWaypoints.length === 1) {
      const [single] = rawWaypoints;
      if (single.trim()) {
        try {
          const parsed = JSON.parse(single);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of arr) {
            const coord = toWaypoint(item);
            if (!coord) {
              return new Response(
                JSON.stringify({ error: "Invalid waypoint format" }),
                {
                  status: 400,
                  headers: {
                    "content-type": "application/json; charset=utf-8"
                  }
                }
              );
            }
            waypointCoords.push(coord);
          }
        } catch {
          const segments = single
            .split("|")
            .map((segment) => segment.trim())
            .filter(Boolean);
          const sources = segments.length > 0 ? segments : [single];
          for (const part of sources) {
            const coord = parseWaypointString(part);
            if (!coord) {
              return new Response(
                JSON.stringify({ error: "Invalid waypoint format" }),
                {
                  status: 400,
                  headers: {
                    "content-type": "application/json; charset=utf-8"
                  }
                }
              );
            }
            waypointCoords.push(coord);
          }
        }
      }
    } else if (rawWaypoints.length > 1) {
      for (const value of rawWaypoints) {
        const segments = value
          .split("|")
          .map((segment) => segment.trim())
          .filter(Boolean);
        const parts = segments.length > 0 ? segments : [value];
        for (const part of parts) {
          const coord = parseWaypointString(part);
          if (!coord) {
            return new Response(
              JSON.stringify({ error: "Invalid waypoint format" }),
              {
                status: 400,
                headers: { "content-type": "application/json; charset=utf-8" }
              }
            );
          }
          waypointCoords.push(coord);
        }
      }
    }

    const MAX_WAYPOINTS = 16;
    if (waypointCoords.length > MAX_WAYPOINTS) {
      return new Response(
        JSON.stringify({ error: `Too many waypoints (max ${MAX_WAYPOINTS})` }),
        {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" }
        }
      );
    }

    for (const { lon, lat } of waypointCoords) {
      if (
        !Number.isFinite(lon) ||
        !Number.isFinite(lat) ||
        lon < -180 ||
        lon > 180 ||
        lat < -90 ||
        lat > 90
      ) {
        return new Response(
          JSON.stringify({ error: "Waypoint coordinates out of range" }),
          {
            status: 400,
            headers: { "content-type": "application/json; charset=utf-8" }
          }
        );
      }
    }

    const origin = request.headers.get("Origin") || `${u.protocol}//${u.host}`;
    const keyId  = (env.NAVER_CLIENT_ID || "").trim();
    const keySec = (env.NAVER_CLIENT_SECRET || "").trim();

    // ⚠️ Directions는 경도,위도(lon,lat) 순서
    const waypointQuery = waypointCoords
      .map(({ lon, lat }) => `${lon},${lat}`)
      .join("|");
    const api =
      `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving` +
      `?start=${sx},${sy}&goal=${ex},${ey}&option=trafast` +
      (waypointQuery ? `&waypoints=${encodeURIComponent(waypointQuery)}` : "");

    const r = await fetch(api, {
      headers: {
        "Accept": "application/json",
        "Referer": origin,
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": keySec
      }
    });

    const text = await r.text();
    const cacheSeconds = waypointCoords.length > 0 ? 60 : 120;
    return new Response(text, {
      status: r.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${cacheSeconds}`
      }
    });
  };
