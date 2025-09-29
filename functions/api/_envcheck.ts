export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID: string; NAVER_CLIENT_SECRET: string; }> =
  async ({ env }) => {
    const id = (env.NAVER_CLIENT_ID ?? "");
    const sec = (env.NAVER_CLIENT_SECRET ?? "");
    return new Response(JSON.stringify({
      id_len: id.length,
      id_head: id.slice(0,4),
      id_tail: id.slice(-4),
      sec_len: sec.length,
      sec_head: sec.slice(0,4),
      sec_tail: sec.slice(-4)
    }), { headers: { "content-type": "application/json; charset=utf-8" }});
  };
