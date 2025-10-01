// functions/api/geocode.ts
type NcpHost = "naveropenapi" | "maps";

function resolveBase(env: Record<string, string | undefined>, override?: NcpHost) {
  if (override === "maps") return "https://maps.apigw.ntruss.com";
  if (override === "naveropenapi") return "https://naveropenapi.apigw.ntruss.com";
  const fromEnv = (env.NAVER_MAPS_HOST || "").trim().toLowerCase();
  if (fromEnv.includes("maps.apigw.ntruss.com")) return "https://maps.apigw.ntruss.com";
  return "https://naveropenapi.apigw.ntruss.com"; // 기본
}

export const onRequestGet: PagesFunction<{
  NAVER_GEOCODE_KEY_ID?: string;
  NAVER_GEOCODE_KEY?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  NAVER_MAPS_HOST?: string;
}> = async ({ request, env }) => {
  const u = new URL(request.url);
  const q = u.searchParams.get("query");
  if (!q) {
    return new Response(JSON.stringify({ error: "Missing query" }), {
      status: 400, headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  // ?host=maps | naveropenapi  (디버그용 강제)
  const hostOverride = (u.searchParams.get("host") as NcpHost | null) || undefined;

  const origin = request.headers.get("Origin") || `${u.protocol}//${u.host}`;
  const keyId =
    (env.NAVER_GEOCODE_KEY_ID || env.NAVER_CLIENT_ID || "").trim();
  const keySec = (env.NAVER_GEOCODE_KEY || env.NAVER_CLIENT_SECRET || "").trim();

  const path = `/map-geocode/v2/geocode?query=${encodeURIComponent(q)}`;
  const headers: HeadersInit = {
    "Accept": "application/json",
    "Referer": origin, // 도메인 매칭 이슈 대비
    "X-NCP-APIGW-API-KEY-ID": keyId,
    "X-NCP-APIGW-API-KEY": keySec
  };

  // 1차: 선택된(혹은 기본) 호스트로 호출
  const base1 = resolveBase(env, hostOverride);
  let r = await fetch(base1 + path, { headers });
  if (!r.ok) {
    // 2차: 반대편 호스트로 폴백 시도 (진단용)
    const base2 = base1.includes("naveropenapi")
      ? "https://maps.apigw.ntruss.com"
      : "https://naveropenapi.apigw.ntruss.com";
    const r2 = await fetch(base2 + path, { headers });
    if (r2.ok) r = r2; // 폴백 성공 시 교체
  }

  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
};
