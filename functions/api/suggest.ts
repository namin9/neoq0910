type Item = { type: "place"|"address"; title: string; subtitle?: string; x: number; y: number; };
type Provider = "kakao" | "naver-local" | "mapbox";

async function fromKakao(q: string, env: any): Promise<Item[]> {
  const key = (env.KAKAO_REST_KEY || "").trim();
  if (!key) return [];
  const headers = { "Authorization": "KakaoAK " + key };

  const kw = await fetch(
    "https://dapi.kakao.com/v2/local/search/keyword.json?size=10&query=" + encodeURIComponent(q),
    { headers }
  ).then(r => r.ok ? r.json() : { documents: [] }).catch(() => ({ documents: [] }));

  const items1: Item[] = (kw.documents || []).map((d: any) => ({
    type: "place",
    title: d.place_name,
    subtitle: d.road_address_name || d.address_name || "",
    x: Number(d.x),
    y: Number(d.y)
  }));

  const ad = await fetch(
    "https://dapi.kakao.com/v2/local/search/address.json?size=5&query=" + encodeURIComponent(q),
    { headers }
  ).then(r => r.ok ? r.json() : { documents: [] }).catch(() => ({ documents: [] }));

  const items2: Item[] = (ad.documents || []).map((d: any) => ({
    type: "address",
    title: d.road_address?.address_name || d.address_name,
    subtitle: d.address?.region_3depth_name || "",
    x: Number(d.x), y: Number(d.y)
  }));

  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of [...items1, ...items2]) {
    const k = `${it.title}|${it.x.toFixed(6)},${it.y.toFixed(6)}`;
    if (!seen.has(k) && Number.isFinite(it.x) && Number.isFinite(it.y)) { seen.add(k); out.push(it); }
  }
  return out;
}

async function fromNaverLocal(q: string, env: any): Promise<Item[]> {
  const id = (env.NAVER_SEARCH_CLIENT_ID || "").trim();
  const sec = (env.NAVER_SEARCH_CLIENT_SECRET || "").trim();
  if (!id || !sec) return [];
  const r = await fetch(
    "https://openapi.naver.com/v1/search/local.json?display=10&query=" + encodeURIComponent(q),
    { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": sec } }
  );
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({} as any));
  const raw = j.items || [];
  // 네이버 Local은 좌표 일관성이 떨어질 수 있어 주소만 우선 표시(좌표는 카카오/맵박스로 보강)
  return raw.map((it: any) => ({
    type: "place",
    title: String(it.title || "").replace(/<[^>]+>/g, ""),
    subtitle: it.roadAddress || it.address || "",
    x: NaN, y: NaN
  }));
}

async function fromMapbox(q: string, env: any): Promise<Item[]> {
  const token = (env.MAPBOX_TOKEN || "").trim();
  if (!token) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?autocomplete=true&language=ko&limit=10&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({} as any));
  const feats = j.features || [];
  return feats.map((f: any) => ({
    type: f.place_type?.[0] === "address" ? "address" : "place",
    title: f.text_ko || f.text || f.place_name_ko || f.place_name,
    subtitle: f.place_name_ko || f.place_name || "",
    x: Number(f.center?.[0]),
    y: Number(f.center?.[1]),
  })).filter((it: Item) => Number.isFinite(it.x) && Number.isFinite(it.y));
}

function dedup(items: Item[], limit = 12): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of items) {
    const k = `${it.title}|${(it.subtitle||"")}|${it.x.toFixed(6)},${it.y.toFixed(6)}`;
    if (!seen.has(k)) { seen.add(k); out.push(it); }
    if (out.length >= limit) break;
  }
  return out;
}

export const onRequestGet: PagesFunction<{
  KAKAO_REST_KEY?: string;
  NAVER_SEARCH_CLIENT_ID?: string;
  NAVER_SEARCH_CLIENT_SECRET?: string;
  MAPBOX_TOKEN?: string;
}> = async ({ request, env }) => {
  const u = new URL(request.url);
  const q = (u.searchParams.get("q") || "").trim();
  const provider = (u.searchParams.get("provider") || "").toLowerCase() as Provider | "";
  const limit = Math.min(parseInt(u.searchParams.get("limit") || "12", 10), 20);

  if (q.length < 2) {
    return new Response(JSON.stringify({ items: [] }), { headers: { "content-type":"application/json; charset=utf-8" }});
  }

  let items: Item[] = [];
  const chain: Provider[] = provider ? [provider] : ["kakao", "naver-local", "mapbox"];

  for (const p of chain) {
    let chunk: Item[] = [];
    if (p === "kakao")       chunk = await fromKakao(q, env);
    else if (p === "naver-local") chunk = await fromNaverLocal(q, env);
    else if (p === "mapbox") chunk = await fromMapbox(q, env);
    items = items.concat(chunk);
    if (items.length >= limit) break;
  }

  return new Response(JSON.stringify({ items: dedup(items, limit) }), {
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"public, max-age=30" }
  });
};
