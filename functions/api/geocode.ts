export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const q = u.searchParams.get("query");
    if (!q) return new Response(JSON.stringify({ error: "Missing query" }), { status: 400, headers: { "content-type": "application/json; charset=utf-8" } });

    const api = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=" + encodeURIComponent(q);

    const keyId = (env.NAVER_CLIENT_ID || "").trim();
    const keySec = (env.NAVER_CLIENT_SECRET || "").trim();

    const r = await fetch(api, {
      headers: {
        "Accept": "application/json",
        "Referer": "https://proto.neoqik.com",
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": keySec
      }
    });

    const text = await r.text();
    return new Response(text, { status: r.status, headers: { "content-type": "application/json; charset=utf-8" } });
  };
