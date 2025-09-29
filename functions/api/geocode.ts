export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string; }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  if (!query) return new Response(JSON.stringify({ error: "Missing query" }), { status: 400 });

  const apiUrl = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=" + encodeURIComponent(query);

  const res = await fetch(apiUrl, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }
  });

  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } });
};
