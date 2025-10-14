export const onRequestGet: PagesFunction<{
  NAVER_GEOCODE_KEY_ID?: string;
  NAVER_GEOCODE_KEY?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
}> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const sx = u.searchParams.get("startX");
    const sy = u.searchParams.get("startY");
    const ex = u.searchParams.get("endX");
    const ey = u.searchParams.get("endY");
    if (!sx || !sy || !ex || !ey) return new Response("Missing coords", { status: 400 });

    const MAX_WAYPOINTS = 8;
    const parseWaypoint = (value: string | null) => {
      if (!value) return null;
      const parts = value
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length < 2) return null;
      const [x, y] = parts;
      return { x, y };
    };

    const waypoints = u.searchParams
      .getAll("waypoints")
      .map((value) => parseWaypoint(value))
      .filter((v): v is { x: string; y: string } => Boolean(v))
      .slice(0, MAX_WAYPOINTS);

    const origin = request.headers.get("Origin") || `${u.protocol}//${u.host}`;
    const keyId =
      (env.NAVER_GEOCODE_KEY_ID || env.NAVER_CLIENT_ID || "").trim();
    const keySec =
      (env.NAVER_GEOCODE_KEY || env.NAVER_CLIENT_SECRET || "").trim();

    const markers = [
      `type:d|size:mid|pos:${sx} ${sy}|label:S`,
      ...waypoints.map((wp, index) => `type:d|size:mid|pos:${wp.x} ${wp.y}|label:W${index + 1}`),
      `type:d|size:mid|pos:${ex} ${ey}|label:E`
    ];

    const markerQuery = markers.map((marker) => `&markers=${marker}`).join("");

    const routePoints = waypoints.length
      ? [`${sx} ${sy}`, ...waypoints.map((wp) => `${wp.x} ${wp.y}`), `${ex} ${ey}`]
      : [];

    const pathQuery = routePoints.length
      ? `&path=strokeColor:0x1F78FFDD|strokeWeight:6|strokeStyle:solid|${routePoints.join("|")}`
      : "";

    const api = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=800&h=480&scale=2${markerQuery}${pathQuery}`;

    const r = await fetch(api, {
      headers: {
        "Referer": origin,
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": keySec
      }
    });

    const h = new Headers(r.headers);
    const cacheControl = "public, max-age=600, s-maxage=600";
    h.set("cache-control", cacheControl);
    const varyValues = new Set(
      (h.get("vary") || "")
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
    );
    varyValues.add("Origin");
    h.set("vary", Array.from(varyValues).join(", "));

    if (waypoints.length) {
      const routeSignature = [`${sx},${sy}`, ...waypoints.map((wp) => `${wp.x},${wp.y}`), `${ex},${ey}`].join("|");
      h.set("etag", `"route:${routeSignature}"`);
    }
    return new Response(r.body, { status: r.status, headers: h });
  };
