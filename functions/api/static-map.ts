export const onRequestGet: PagesFunction<{
  NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const startX = url.searchParams.get("startX");
  const startY = url.searchParams.get("startY");
  const endX   = url.searchParams.get("endX");
  const endY   = url.searchParams.get("endY");
  if (!startX || !startY || !endX || !endY) {
    return new Response("Missing coords", { status: 400 });
  }

  const apiUrl =
    `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster` +
    `?w=800&h=480&scale=2` +
    `&markers=type:d|size:mid|pos:${startX} ${startY}|label:S` +
    `&markers=type:d|size:mid|pos:${endX} ${endY}|label:E`;

  const res = await fetch(apiUrl, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }
  });

  const headers = new Headers(res.headers);
  headers.set("cache-control", "public, max-age=600");
  return new Response(res.body, { status: res.status, headers });
};
