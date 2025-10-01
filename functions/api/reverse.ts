export const onRequestGet: PagesFunction<{
  KAKAO_REST_KEY?: string;
  NAVER_GEOCODE_KEY_ID?: string;
  NAVER_GEOCODE_KEY?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
}> = async ({ request, env }) => {
  const u = new URL(request.url);
  const x = u.searchParams.get("x"); // lon
  const y = u.searchParams.get("y"); // lat
  const provider = (u.searchParams.get("provider") || "kakao").toLowerCase();
  if (!x || !y) return new Response(JSON.stringify({ error: "Missing x,y" }), { status: 400, headers: { "content-type":"application/json; charset=utf-8" }});

  if (provider === "kakao") {
    const key = (env.KAKAO_REST_KEY || "").trim();
    const r = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&input_coord=WGS84`, {
      headers: { "Authorization": "KakaoAK " + key }
    });
    const j = await r.json().catch(() => ({}));
    const doc = (j.documents || [])[0];
    const label = doc?.road_address?.address_name || doc?.address?.address_name || "";
    return new Response(JSON.stringify({ address: label }), { headers: { "content-type":"application/json; charset=utf-8" }});
  }

  // 네이버(클라우드)로 하고 싶다면:
  const id = (env.NAVER_GEOCODE_KEY_ID || env.NAVER_CLIENT_ID || "").trim();
  const sec = (env.NAVER_GEOCODE_KEY || env.NAVER_CLIENT_SECRET || "").trim();
  const r = await fetch(`https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${encodeURIComponent(x)},${encodeURIComponent(y)}&output=json&orders=roadaddr,addr`, {
    headers: { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": sec }
  });
  const j = await r.json().catch(() => ({}));
  const area = j?.results?.[0]?.region;
  const land = j?.results?.[0]?.land;
  const label = land?.name
    ? `${area?.area1?.name || ""} ${area?.area2?.name || ""} ${area?.area3?.name || ""} ${land?.name} ${land?.number1 || ""}`.trim()
    : "";
  return new Response(JSON.stringify({ address: label }), { headers: { "content-type":"application/json; charset=utf-8" }});
};
