import { useEffect, useRef, useState } from "react";

type Item = { type: "place"|"address"; title: string; subtitle?: string; x: number; y: number; };
type Props = {
  placeholder?: string;
  onSelect: (item: Item) => void;
  provider?: "kakao" | "naver-local" | "mapbox"; // 선택
};

export default function AutoSuggest({ placeholder="검색어 입력", onSelect, provider }: Props) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const timer = useRef<number | null>(null);
  const ctrl  = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setList([]); setOpen(false); return; }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        if (ctrl.current) ctrl.current.abort();
        ctrl.current = new AbortController();
        const url = `/api/suggest?q=${encodeURIComponent(q)}${provider ? "&provider="+provider : ""}`;
        const res = await fetch(url, { signal: ctrl.current.signal });
        const data = await res.json();
        setList(data.items || []);
        setOpen(true); setIdx(-1);
      } catch (_) { /* ignore */ }
    }, 200);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q, provider]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || list.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i+1, list.length-1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(i => Math.max(i-1, 0)); }
    if (e.key === "Enter" && idx >= 0) { e.preventDefault(); onSelect(list[idx]); setOpen(false); }
  };

  return (
    <div className="autosuggest">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => list.length && setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && list.length > 0 && (
        <div className="panel">
          {list.map((it, i) => (
            <div
              key={`${it.title}-${i}`}
              className={`row ${i===idx?"active":""}`}
              onMouseDown={() => { onSelect(it); setOpen(false); }}
            >
              <div className="t">{it.title}</div>
              {it.subtitle ? <div className="s">{it.subtitle}</div> : null}
              <div className={`tag ${it.type}`}>{it.type}</div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .autosuggest{ position:relative; }
        .autosuggest input{ width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; }
        .panel{ position:absolute; z-index:10; left:0; right:0; max-height:260px; overflow:auto; border:1px solid #ddd; border-radius:10px; background:var(--bg,#fff); box-shadow:0 6px 20px rgba(0,0,0,.08); margin-top:6px; }
        .row{ padding:10px 12px; cursor:pointer; display:flex; gap:8px; align-items:center; }
        .row:hover,.row.active{ background:rgba(0,0,0,.06); }
        .t{ flex:1; font-weight:600; }
        .s{ flex:2; color:#666; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tag{ font-size:10px; padding:2px 6px; border-radius:999px; border:1px solid #ccc; }
        .tag.place{ border-color:#4c8bf5; }
        .tag.address{ border-color:#12b886; }
      `}</style>
    </div>
  );
}
