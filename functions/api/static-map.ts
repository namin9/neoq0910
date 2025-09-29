export const onRequestGet: PagesFunction<{ NAVER_CLIENT_ID:string; NAVER_CLIENT_SECRET:string; }> =
  async ({ request, env }) => {
    const u=new URL(request.url);
    const sx=u.searchParams.get("startX"), sy=u.searchParams.get("startY");
    const ex=u.searchParams.get("endX"),   ey=u.searchParams.get("endY");
    if(!sx||!sy||!ex||!ey) return new Response("Missing coords",{status:400});
    const api=`https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=800&h=480&scale=2&markers=type:d|size:mid|pos:${sx} ${sy}|label:S&markers=type:d|size:mid|pos:${ex} ${ey}|label:E`;
    const r=await fetch(api,{ headers:{
      "X-NCP-APIGW-API-KEY-ID": env.NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": env.NAVER_CLIENT_SECRET
    }});
    return new Response(r.body,{ status:r.status, headers:r.headers });
  };
