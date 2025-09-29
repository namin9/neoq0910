export const onRequestGet: PagesFunction<{
  NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string;
}> = async ({ env }) => {
  // 실제 값은 노출하지 말고, 존재 여부만 true/false로 확인
  const hasId = typeof env.NAVER_CLIENT_ID === "string" && env.NAVER_CLIENT_ID.length > 0;
  const hasSecret = typeof env.NAVER_CLIENT_SECRET === "string" && env.NAVER_CLIENT_SECRET.length > 0;

  return new Response(JSON.stringify({
    ok: hasId && hasSecret,
    hasId,
    hasSecret
  }), { headers: { "content-type": "application/json; charset=utf-8" } });
};
