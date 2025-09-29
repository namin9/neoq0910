export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u=new URL(request.url); const q=u.searchParams.get("query");
    if(!q) return new Response(JSON.stringify({error:"Missing query"}),{status:400,headers:{ "content-type":"application/json" }});

    const api="https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query="+encodeURIComponent(q);

    const r = await fetch(api, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
      }
    });

    const text = await r.text();

    // 문제 원인 파악용(키 일부만 로그)
    if (!r.ok) {
      console.error("NAVER 401/403:", r.status, text.slice(0,200));
    }

    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  };
