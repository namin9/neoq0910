export const onRequestGet: PagesFunction<{
  NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string;
}> = async ({ request, env }) => {
  const u = new URL(request.url);
  const q = u.searchParams.get("query");
  if (!q) return new Response(JSON.stringify({error:"Missing query"}), {status:400});

  const api = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=" + encodeURIComponent(q);

  const res = await fetch(api, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }
  });

  // 디버깅 도움: 401/403이면 본문도 같이 보자
  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { "content-type": "application/json; charset=utf-8" }});
  }
  return new Response(res.body, { status: res.status, headers: res.headers });
};
