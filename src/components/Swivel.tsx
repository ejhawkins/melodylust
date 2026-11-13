import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useServerFn } from "@tanstack/react-start";
import { gsap } from "gsap";
import { ArrowLeft, ArrowRight, Lock, Unlock, Shuffle, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { LikeButton } from "./LikeButton";
import { LookPreview } from "./LookPreview";
import { lookupProducts } from "@/lib/products.functions";
import { formatPrice, type ShopProduct } from "@/lib/farfetch";
import { useStyleProfile } from "@/lib/use-style-profile";
import { addWish } from "@/lib/wishlist";
import { SWIVEL_LAYERS, wrap, shuffleRings, frontPiece, snapAngle } from "@/lib/swivel";

export function Swivel({ playing = false }: { playing?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const lookup = useServerFn(lookupProducts);
  const { profile } = useStyleProfile();
  const [products, setProducts] = useState<ShopProduct[][]>([[], [], [], []]);
  const [status, setStatus] = useState<string[]>(["loading", "loading", "loading", "loading"]);
  const [indices, setIndices] = useState([0, 0, 0, 0]);
  const [locks, setLocks] = useState([false, false, false, false]);
  const [visible, setVisible] = useState(false);
  const [flat, setFlat] = useState(false);
  const [touching, setTouching] = useState(false);
  const [message, setMessage] = useState("");
  const loaded = useRef(false);
  const suppressClick = useRef(false);
  const drag = useRef<{ x: number; y: number; ring: number; active: boolean } | null>(null);
  const rotation = useRef({ angle: 0 });
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => { const update = () => setTabVisible(!document.hidden); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update); }, []);
  useEffect(() => {
    if (!flat) return;
    rows.current.forEach((row, i) => {
      const card = row?.querySelector<HTMLElement>("[data-front='true']");
      if (row && card) row.scrollTo({ left: card.offsetLeft - row.clientWidth / 2 + card.clientWidth / 2, behavior: "instant" });
    });
  }, [indices, flat]);

  useEffect(() => {
    if (!root.current) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => setFlat(motion.matches || !CSS.supports("transform-style", "preserve-3d")); check(); motion.addEventListener("change", check);
    const observer = new IntersectionObserver(entries => setVisible(entries.some(e => e.isIntersecting)), { threshold: .05 });
    observer.observe(root.current);
    return () => { observer.disconnect(); motion.removeEventListener("change", check); };
  }, []);
  useEffect(() => {
    if (!visible || loaded.current) return;
    loaded.current = true;
    SWIVEL_LAYERS.forEach((layer, i) => {
      const bias = [profile.color[0], profile.material[0]].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z -]/g, "");
      void lookup({ data: { item: `${bias} ${layer.query}`.trim().slice(0, 60), limit: 8 } }).then(result => {
        setProducts(all => all.map((p, n) => n === i ? result.products.slice(0, 12) : p));
        setStatus(all => all.map((s, n) => n === i ? result.status === "ok" ? result.products.length ? "ready" : "empty" : result.status : s));
      }).catch(() => setStatus(all => all.map((s, n) => n === i ? "unavailable" : s)));
    });
  }, [visible, profile, lookup]);
  useEffect(() => {
    if (!scene.current || flat || !visible || touching) return;
    const element = scene.current;
    const tick = (_time: number, delta: number) => { if (!document.hidden) { rotation.current.angle += delta * .009; element.style.setProperty("--swivel-orbit", String(Math.sin(rotation.current.angle * Math.PI / 180) * 8)); } };
    gsap.ticker.add(tick); return () => gsap.ticker.remove(tick);
  }, [flat, visible, touching]);
  const select = (ring: number, value: number) => setIndices(all => all.map((n, i) => i === ring ? wrap(value, products[i]?.length ?? 0) : n));
  const front = products.flatMap((list, i) => { const p = list[wrap(indices[i] ?? 0, list.length)]; return p ? [p] : []; });
  const complete = front.length === 4;
  const outfitKey = front.map(p => p.id).join("-");
  const name = front.map(p => `${p.brand} ${p.name}`).join(" + ");
  const shuffle = () => { setIndices(shuffleRings(indices, products.map(p => p.length), locks)); setMessage("A new look is on the rail."); };
  const turn = (i: number, step: number) => select(i, (indices[i] ?? 0) + step);
  return <section ref={root} className="ls-swivel" aria-labelledby="swivel-heading" data-flat={flat} data-visible={visible} data-playing={playing && !flat && visible && !touching && tabVisible}>
    <header><h3 id="swivel-heading" data-revealed={visible}>{["The", "Swivel"].map((word, i) => <Fragment key={word}>{i > 0 && " "}<span className="swivel-word">{Array.from(word).map((letter, j) => <span key={j}>{letter}</span>)}</span></Fragment>)}</h3><p>Turn the rail. Dress the look.</p></header>
    <div ref={scene} className="swivel-scene">
      <div className="swivel-axis" aria-label="Turn the whole rail" onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, ring: -1, active: true }; setTouching(true); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (drag.current?.ring !== -1) return; rotation.current.angle += (e.clientY - drag.current.y) * .4; drag.current.y = e.clientY; scene.current?.style.setProperty("--swivel-orbit", String(Math.sin(rotation.current.angle * Math.PI / 180) * 12)); }} onPointerUp={() => { drag.current = null; setTouching(false); }} onPointerCancel={() => { drag.current = null; setTouching(false); }} />
      {SWIVEL_LAYERS.map((layer, i) => {
        const list = products[i] ?? [];
        const current = wrap(indices[i] ?? 0, list.length);
        const piece = list[current];
        const label = `${layer.name}, ${list.length ? `${current + 1} of ${list.length}: ${piece?.brand} ${piece?.name}` : "no pieces"}`;
        return <div className="swivel-layer" key={layer.name}>
          <div className="swivel-layer-head"><h4>{layer.name}</h4><span>{list.length ? `${current + 1} / ${list.length}` : "—"}</span><Button variant="listenOutline" size="icon" aria-label={`${locks[i] ? "Unlock" : "Lock"} ${layer.name}`} aria-pressed={locks[i]} title={`${locks[i] ? "Unlock" : "Lock"} ${layer.name}`} onClick={() => setLocks(all => all.map((v, n) => n === i ? !v : v))}>{locks[i] ? <Lock /> : <Unlock />}</Button></div>
          <div ref={el => { rows.current[i] = el; }} className="swivel-ring" role="group" tabIndex={0} aria-label={label}
            onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "s", "S"].includes(e.key)) e.preventDefault(); if (e.key === "ArrowLeft" || e.key === "ArrowRight") turn(i, e.key === "ArrowRight" ? 1 : -1); if (e.key === "ArrowUp" || e.key === "ArrowDown") rows.current[wrap(i + (e.key === "ArrowDown" ? 1 : -1), 4)]?.focus(); if (e.key === "Enter" && piece) window.open(piece.link, "_blank", "noopener,noreferrer"); if (e.key.toLowerCase() === "s") shuffle(); }}
            onPointerDown={e => { if ((e.target as HTMLElement).closest("a,button")) return; drag.current = { x: e.clientX, y: e.clientY, ring: i, active: false }; setTouching(true); }}
            onPointerMove={e => { const d = drag.current; if (!d || d.ring !== i) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.active && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) { d.active = true; e.currentTarget.setPointerCapture(e.pointerId); } if (d.active) e.currentTarget.style.setProperty("--swivel-drag", `${dx * .2}deg`); }}
            onPointerUp={e => { const d = drag.current; if (d?.ring === i && d.active) { suppressClick.current = true; const count = list.length; const step = count ? 360 / count : 0; const dx = e.clientX - d.x; const travel = Math.sign(dx) * Math.max(Math.abs(dx) * .5, step); const angle = -(indices[i] ?? 0) * step + travel; select(i, frontPiece(snapAngle(angle, count), count)); } drag.current = null; setTouching(false); e.currentTarget.style.setProperty("--swivel-drag", "0deg"); }}
            onPointerCancel={e => { drag.current = null; setTouching(false); e.currentTarget.style.setProperty("--swivel-drag", "0deg"); }}>
            {list.length ? list.map((p, j) => {
              let offset = wrap(j - current, list.length); if (offset > list.length / 2) offset -= list.length;
              const angle = offset * 360 / list.length;
              if (!flat && Math.abs(angle) > 120) return null;
              return <a key={p.id} href={p.link} target="_blank" rel="noopener noreferrer" className="swivel-piece" data-front={j === current} tabIndex={j === current ? 0 : -1} style={{ "--piece-angle": `${angle}deg`, "--piece-depth": Math.cos(angle * Math.PI / 180), "--piece-offset": offset } as CSSProperties} draggable={false} onPointerDown={e => { suppressClick.current = false; drag.current = { x: e.clientX, y: e.clientY, ring: i, active: false }; setTouching(true); }} onClick={e => { if (suppressClick.current || j !== current) { e.preventDefault(); if (!suppressClick.current) select(i, j); } suppressClick.current = false; }}>
                <img src={p.image} alt={`${p.brand} ${p.name}`} draggable={false} onError={() => setProducts(all => all.map((row, n) => n === i ? row.filter(item => item.id !== p.id) : row))} /><span><strong>{p.brand}</strong><span>{p.name}</span><em>{formatPrice(p.price, p.currency)}</em></span>
              </a>;
            }) : <p role="status" className="swivel-empty">{status[i] === "loading" ? `Finding ${layer.name.toLowerCase()}…` : status[i] === "not_configured" ? "The shop isn’t connected." : status[i] === "unavailable" ? "The shop isn’t answering right now." : "No pieces available in this layer."}</p>}
          </div>
          <div className="swivel-arrows"><Button variant="listenOutline" size="icon" aria-label={`Previous ${layer.name}`} disabled={!list.length} onClick={() => turn(i, -1)}><ArrowLeft /></Button><Button variant="listenOutline" size="icon" aria-label={`Next ${layer.name}`} disabled={!list.length} onClick={() => turn(i, 1)}><ArrowRight /></Button></div>
        </div>;
      })}
    </div>
    <div className="swivel-actions"><Button variant="listenOutline" size="bar" disabled={!front.length} onClick={shuffle}><Shuffle />Shuffle</Button><Button variant="listenSolid" size="bar" disabled={!complete} onClick={() => { front.forEach(p => addWish({ kind: "piece", name: `${p.brand} ${p.name}`, detail: formatPrice(p.price, p.currency), link: p.link, image: p.image, note: "", from: "The Swivel" })); setMessage("Four pieces added to your Want List."); }}><Plus />Add look to Want List</Button>
      {complete && <LikeButton kind="fashion" id={`swivel-${outfitKey}`} name={name} sub="The Swivel" {...(front[0] ? { image: front[0].image } : {})} />}
    </div>
    <p role="status" aria-live="polite" className="swivel-announcement">{message || SWIVEL_LAYERS.map((l, i) => `${l.name}: ${products[i]?.[wrap(indices[i] ?? 0, products[i]?.length ?? 0)]?.name ?? "no piece"}`).join(". ")}</p>
    {complete && <><p className="swivel-credit">Model preview uses up to three pieces · one credit per request.</p><LookPreview products={front.slice(0, 3)} from="The Swivel" mood={profile.aesthetic[0]} /></>}
  </section>;
}