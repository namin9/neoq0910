export const onRequestGet: PagesFunction<{
  NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string;
}> = async ({ request, env }) => {
  const u = new URL(request.url);
  const target = u.searchParams.get("target") || "geocode";

  // 입력 좌표/쿼리
  const q  = u.searchParams.get("query") || "서울역";
  const sx = u.searchParams.get("startX") || "126.9707";
  const sy = u.searchParams.get("startY") || "37.5536";
  const ex = u.searchParams.get("endX")   || "127.1069";
  const ey = u.searchParams.get("endY")   || "37.3700";

  // 동적 Referer (Preview/Production 모두 커버)
  const origin = request.headers.get("Origin") || `${u.protocol}//${u.host}`;

  // 공백/개행 제거
  const keyId  = (env.NAVER_CLIENT_ID || "").trim();
  const keySec = (env.NAVER_CLIENT_SECRET || "").trim();

  // 엔드포인트 선택
  let api = "";
  if (target === "geocode") {
    api = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(q)}`;
  } else if (target === "static") {
    api = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=800&h=480&scale=2` +
          `&markers=type:d|size:mid|pos:${sx} ${sy}|label:S&markers=type:d|size:mid|pos:${ex} ${ey}|label:E`;
  } else if (target === "directions") {
    api = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${sx},${sy}&goal=${ex},${ey}&option=trafast`;
  } else {
    return new Response(JSON.stringify({ error: "Unknown target" }), { status: 400, headers: { "content-type": "application/json; charset=utf-8" }});
  }

  // 네이버 호출
  const r = await fetch(api, {
    headers: {
      "Accept": "application/json",
      "Referer": origin, // 도메인 매칭 이슈 방지용
      "X-NCP-APIGW-API-KEY-ID": keyId,
      "X-NCP-APIGW-API-KEY": keySec
    }
  });

  // 응답 메타/헤더/본문을 그대로 돌려보냄 (Secrets는 절대 노출 X)
  const rawBody = await r.text();
  const respHeaders: Record<string, string> = {};
  r.headers.forEach((v, k) => { respHeaders[k] = v; });

  return new Response(JSON.stringify({
    sent: {
      target, origin,
      headers: {
        "Accept": "application/json",
        "Referer": origin,
        "X-NCP-APIGW-API-KEY-ID": keyId.slice(0,4) + "…",
        "X-NCP-APIGW-API-KEY": keySec.slice(0,4) + "…"
      },
      api
    },
    naver: {
      status: r.status,
      headers: respHeaders,
      body: rawBody
    }
  }, null, 2), { status: 200, headers: { "content-type": "application/json; charset=utf-8" }});
};
