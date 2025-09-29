export const onRequestGet: PagesFunction<{
  NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }
  const apiUrl =
    "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=" +
    encodeURIComponent(query);

  const res = await fetch(apiUrl, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }
  });

  // 그대로 전달 + 캐시 & CORS(동일 도메인이면 불필요하지만 안전하게)
  const headers = new Headers(res.headers);
  headers.set("cache-control", "public, max-age=300");
  headers.set("access-control-allow-origin", "*");
  return new Response(res.body, { status: res.status, headers });
};
