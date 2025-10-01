export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const sx = u.searchParams.get("startX");
    const sy = u.searchParams.get("startY");
    const ex = u.searchParams.get("endX");
    const ey = u.searchParams.get("endY");
    if (!sx || !sy || !ex || !ey) return new Response("Missing coords", { status: 400 });

    const origin = request.headers.get("Origin") || `${u.protocol}//${u.host}`;
    const keyId  = (env.NAVER_CLIENT_ID || "").trim();
    const keySec = (env.NAVER_CLIENT_SECRET || "").trim();

    const waypoints = (u.searchParams.get("waypoints") || "")
      .split("|")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => pair.split(",", 2))
      .filter(([wx, wy]) => wx && wy);

    let api = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=800&h=480&scale=2`
            + `&markers=type:d|size:mid|pos:${sx} ${sy}|label:S`
            + `&markers=type:d|size:mid|pos:${ex} ${ey}|label:E`;

    waypoints.forEach(([wx, wy], idx) => {
      api += `&markers=type:d|size:small|pos:${wx} ${wy}|label:${idx + 1}`;
    });

    const r = await fetch(api, {
      headers: {
        "Referer": origin,
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": keySec
      }
    });

    const h = new Headers(r.headers);
    h.set("cache-control", "public, max-age=600");
    return new Response(r.body, { status: r.status, headers: h });
  };
