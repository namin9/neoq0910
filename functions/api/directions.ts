export const onRequestGet: PagesFunction<{
  NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const startX = url.searchParams.get("startX");
  const startY = url.searchParams.get("startY");
  const endX   = url.searchParams.get("endX");
  const endY   = url.searchParams.get("endY");
  if (!startX || !startY || !endX || !endY) {
    return new Response(JSON.stringify({ error: "Missing coords" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  // 네이버 길찾기: start/goal 은 "lon,lat" 순서
  const apiUrl =
    `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving` +
    `?start=${startX},${startY}&goal=${endX},${endY}&option=trafast`;

  const res = await fetch(apiUrl, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }
  });

  const headers = new Headers(res.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", "*");
  headers.set("cache-control", "public, max-age=120");
  return new Response(await res.text(), { status: res.status, headers });
};
