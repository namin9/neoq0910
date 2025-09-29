export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const sx = u.searchParams.get("startX");
    const sy = u.searchParams.get("startY");
    const ex = u.searchParams.get("endX");
    const ey = u.searchParams.get("endY");
    if (!sx || !sy || !ex || !ey) return new Response("Missing coords", { status: 400 });

    const api = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=800&h=480&scale=2` +
                `&markers=type:d|size:mid|pos:${sx} ${sy}|label:S` +
                `&markers=type:d|size:mid|pos:${ex} ${ey}|label:E`;

    const r = await fetch(api, {
      headers: {
        // 이미지 API도 동일 정책 걸릴 수 있어 Referer 부여
        "Referer": "https://proto.neoqik.com",
        "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
      }
    });

    // 이미지 바이너리 그대로 전달
    const h = new Headers(r.headers);
    h.set("cache-control", "public, max-age=600");
    return new Response(r.body, { status: r.status, headers: h });
  };
