export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const sx = u.searchParams.get("startX");
    const sy = u.searchParams.get("startY");
    const ex = u.searchParams.get("endX");
    const ey = u.searchParams.get("endY");
    const waypoints = (u.searchParams.get("waypoints") || "").trim();
    if (!sx || !sy || !ex || !ey) {
      return new Response(JSON.stringify({ error: "Missing coords" }), {
        status: 400, headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const origin = request.headers.get("Origin") || `${u.protocol}//${u.host}`;
    const keyId  = (env.NAVER_CLIENT_ID || "").trim();
    const keySec = (env.NAVER_CLIENT_SECRET || "").trim();

    // ⚠️ Directions는 경도,위도(lon,lat) 순서
    let api = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving`
            + `?start=${sx},${sy}&goal=${ex},${ey}&option=trafast`;
    if (waypoints) {
      api += `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    const r = await fetch(api, {
      headers: {
        "Accept": "application/json",
        "Referer": origin,
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": keySec
      }
    });

    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=120" }
    });
  };
