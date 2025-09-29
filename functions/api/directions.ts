export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u=new URL(request.url);
    const sx=u.searchParams.get("startX"), sy=u.searchParams.get("startY");
    const ex=u.searchParams.get("endX"),   ey=u.searchParams.get("endY");
    if(!sx||!sy||!ex||!ey) return new Response(JSON.stringify({error:"Missing coords"}),{status:400,headers:{ "content-type":"application/json"}});
    const api=`https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${sx},${sy}&goal=${ex},${ey}&option=trafast`;
    const r=await fetch(api,{ headers:{
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }});
    const text=await r.text();
    return new Response(text,{ status:r.status, headers:{ "content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120"}});
  };
