export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u = new URL(request.url);
    const q = u.searchParams.get("query");
    if (!q) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400, headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    // ✅ 현재 호출한 쪽(브라우저)의 Origin/Host를 참조해서 Referer를 동적으로 구성
    const origin = request.headers.get("Origin")
                 || `${u.protocol}//${u.host}`; // pages.dev / proto.neoqik.com 모두 커버
    const keyId  = (env.NAVER_CLIENT_ID || "").trim();
    const keySec = (env.NAVER_CLIENT_SECRET || "").trim();

    const api = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=" + encodeURIComponent(q);

    const r = await fetch(api, {
      headers: {
        "Accept": "application/json",
        "Referer": origin, // 🔑 동적 Referer
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": keySec
      }
    });

    const text = await r.text();
    // 상태/본문 일부를 그대로 전달(원인 파악용)
    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  };
