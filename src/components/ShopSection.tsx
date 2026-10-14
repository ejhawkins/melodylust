import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, LoaderCircle, X } from "lucide-react";
import { lookupShopCatalog } from "@/lib/products.functions";
import { formatPrice, type CatalogProduct } from "@/lib/farfetch";
import { addWish, removeWish, updateWish, useWishlist } from "@/lib/wishlist";

const PICKKEY = "ml-shop-song-picks";

/** Songs a piece can be paired with — the same featured songs as the home page. */
const SONG_PICKS = [
  { id: "6ouTGbETM7ZdID1eMXZJde", name: "Day 'N' Nite — Kid Cudi" },
  { id: "5rfOARz6QO73wPATyMtQQZ", name: "DANCE... — Slayyyter" },
  { id: "3LtqBgvHGsaSjYw9NmLkky", name: "WE ON GO II — BIA" },
  { id: "3fuCoVxqdBRd0xBeEivlR4", name: "Nicole Kidman — ADÉLA" },
  { id: "0xDxS2g775ttrfrwDQl9f8", name: "I Know What You Want — Busta Rhymes" },
  { id: "0Vtvich3vkhne7Pzum3tXF", name: "Fashion Week — Wale" },
];
const AVAILABILITY_LABEL = { in_stock: "In stock", low_stock: "Low stock", unknown: "Availability not listed" } as const;
const uniq = (a: string[]) => [...new Set(a)].sort();

/** The song currently picked for a product, or "" — read from the same store SongPick writes. */
function readPick(productId: string): string {
  try {
    const id = (JSON.parse(localStorage.getItem(PICKKEY) || "{}") as Record<string, string>)[productId];
    return SONG_PICKS.find(s => s.id === id)?.name ?? "";
  } catch { return ""; }
}

export function ShopSection() {
  const getCatalog = useServerFn(lookupShopCatalog);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [avail, setAvail] = useState("");
  const [max, setMax] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const wishes = useWishlist();
  /** A shop piece's Want List entry, if the heart is on. */
  const wishFor = (p: CatalogProduct) => wishes.find(i => i.kind === "piece" && i.from === "Shop" && i.name === `${p.brand} ${p.name}`);
  const toggleWish = (p: CatalogProduct) => {
    const w = wishFor(p);
    if (w) removeWish(w.id);
    else addWish({ kind: "piece", name: `${p.brand} ${p.name}`, detail: formatPrice(p.price, p.currency), link: p.link, note: readPick(p.id), from: "Shop", image: p.image });
  };
  const shopCount = wishes.filter(i => i.from === "Shop").length;

  useEffect(() => {
    let current = true;
    getCatalog().then(response => {
      if (!current) return;
      setProducts(response.products);
      setCatalogError(response.error);
    }).catch(() => { if (current) setCatalogError("Live products are unavailable right now. Please try again soon."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [getCatalog]);

  const cats = useMemo(() => uniq(products.map(p => p.category)), [products]);
  const brands = useMemo(() => uniq(products.map(p => p.brand)), [products]);
  const sizes = useMemo(() => uniq(products.flatMap(p => p.sizes)), [products]);

  const clear = () => { setQ(""); setCat(""); setBrand(""); setSize(""); setAvail(""); setMax(""); };
  const dirty = !!(q || cat || brand || size || avail || max);

  const results = useMemo(() => {
    const needle = q.toLowerCase().trim();
    const cap = max ? Number(max) : 0;
    return products.filter(p =>
      (!needle || [p.name, p.brand, p.category, p.description, ...p.tags].join(" ").toLowerCase().includes(needle)) &&
      (!cat || p.category === cat) && (!brand || p.brand === brand) &&
      (!size || p.sizes.includes(size)) && (!avail || p.availability === avail) && (!cap || p.price <= cap) &&
      (!onlySaved || wishes.some(i => i.kind === "piece" && i.from === "Shop" && i.name === `${p.brand} ${p.name}`)));
  }, [products, q, cat, brand, size, avail, max, onlySaved, wishes]);

  const chips = ([
    ["q", `“${q}”`], ["cat", cat], ["brand", brand],
    ["size", `Size ${size}`], ["avail", avail && AVAILABILITY_LABEL[avail as keyof typeof AVAILABILITY_LABEL]],
    ["max", max && `Under $${max}`],
  ] as const).filter(([k]) => ({ q, cat, brand, size, avail, max })[k] !== "");

  const open = openId ? products.find(p => p.id === openId) : undefined;

  return (
    <section className="mlshop" id="shop" aria-label="Shop the moodboard">
      <h2 className="iconic-title"><span>+ Shop the moodboard</span></h2>

      <div className="mlshop-bar">
        <input className="search-input mlshop-search" aria-label="Search products" value={q} onChange={e => setQ(e.target.value)} placeholder="Search “A-line skirt”, “cropped denim jacket”…" />
        <select className="genre-select" aria-label="Category" value={cat} onChange={e => setCat(e.target.value)}><option value="">All categories</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <select className="genre-select" aria-label="Designer or brand" value={brand} onChange={e => setBrand(e.target.value)}><option value="">All brands</option>{brands.map(c => <option key={c}>{c}</option>)}</select>
        <select className="genre-select" aria-label="Size" value={size} onChange={e => setSize(e.target.value)}><option value="">Any size</option>{sizes.map(c => <option key={c}>{c}</option>)}</select>
        <select className="genre-select" aria-label="Availability" value={avail} onChange={e => setAvail(e.target.value)}><option value="">Any availability</option>{Object.entries(AVAILABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="genre-select" aria-label="Maximum price" value={max} onChange={e => setMax(e.target.value)}><option value="">Any price</option>{[100, 200, 500, 1000].map(v => <option key={v} value={v}>Under ${v}</option>)}</select>
        <button type="button" onClick={() => setOnlySaved(v => !v)} aria-pressed={onlySaved} className="mlshop-saved">
          <Heart aria-hidden className="h-3 w-3" fill={onlySaved ? "currentColor" : "none"} />Wishlist ({shopCount})
        </button>
      </div>

      <div className="mlshop-meta" aria-live="polite">
        <span className="mlshop-count">{results.length} {results.length === 1 ? "piece" : "pieces"}</span>
        {chips.map(([k, label]) => (
          <button key={k} type="button" onClick={() => ({ q: setQ, cat: setCat, brand: setBrand, size: setSize, avail: setAvail, max: setMax })[k]("")} aria-label={`Remove filter ${label}`} className="mlshop-chip">{label}<X aria-hidden className="h-2.5 w-2.5" /></button>
        ))}
        {dirty && <button type="button" onClick={clear} className="mlshop-clear">Clear all</button>}
      </div>

      {loading ? (
        <p className="mlshop-empty mlshop-loading"><LoaderCircle aria-hidden />Loading live Farfetch pieces…</p>
      ) : catalogError ? (
        <p className="mlshop-empty" role="status">{catalogError}</p>
      ) : results.length === 0 ? (
        <p className="mlshop-empty">
          {onlySaved && shopCount === 0
            ? "Your wishlist is empty — tap the heart on any piece to keep it here."
            : "Nothing matches those filters. Try removing one."}
        </p>
      ) : (
        <ul className="mlshop-grid">
          {results.map(p => {
            const saved = !!wishFor(p);
            return (
              <li className="mlshop-card" key={p.id}>
                <button type="button" className="mlshop-card-media" onClick={() => setOpenId(p.id)} aria-label={`View ${p.name}`}>
                   <ProductImage src={p.image} alt={`${p.brand} ${p.name}`} />
                   {p.availability === "low_stock" && <span className="mlshop-flag">Low stock</span>}
                </button>
                <button type="button" onClick={() => toggleWish(p)} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`} className="mlshop-heart" data-saved={saved}><Heart aria-hidden className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} /></button>
                 <button type="button" className="mlshop-card-text" onClick={() => setOpenId(p.id)}>
                  <span className="mlshop-name">{p.name}</span>
                  <span className="mlshop-brand">{p.brand}</span>
                   <span className="mlshop-price">{formatPrice(p.price, p.currency)}</span>
                </button>
                <SongPick productId={p.id} compact onChoose={name => { const w = wishFor(p); if (w) updateWish(w.id, { note: name }); }} />
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !catalogError && <p className="mlshop-note">Live products via Farfetch · prices, sizes and availability can change at the retailer.</p>}

      {open && <ShopDetail p={open} saved={!!wishFor(open)} onSave={() => toggleWish(open)} onClose={() => setOpenId(null)} />}
    </section>
  );
}

/**
 * Farfetch's photo host intermittently refuses a request, which used to leave a bare
 * line of alt text in the grid. Retry once, then hold the space with a labelled gap.
 */
function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setAttempt(0); setFailed(false); }, [src]);
  if (failed) {
    return (
      <span className={`mlshop-img-fallback${className ? ` ${className}` : ""}`} role="img" aria-label={`${alt} — photo unavailable`}>
        <span>Photo unavailable</span>
      </span>
    );
  }
  return (
    <img
      key={attempt}
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      width={640}
      height={800}
      referrerPolicy="no-referrer"
      onError={() => (attempt < 1 ? setAttempt(a => a + 1) : setFailed(true))}
    />
  );
}

/** "Goes with a song" slot on a product: pick one of the featured songs and its player
 *  embeds under the piece. The pairing is saved on this device, per product. */
function SongPick({ productId, compact = false, onChoose }: { productId: string; compact?: boolean; onChoose?: (songName: string) => void }) {
  const [pick, setPick] = useState("");
  useEffect(() => {
    try { setPick((JSON.parse(localStorage.getItem(PICKKEY) || "{}") as Record<string, string>)[productId] ?? ""); } catch { /* Empty slot. */ }
  }, [productId]);
  const choose = (id: string) => {
    setPick(id);
    try {
      const all = JSON.parse(localStorage.getItem(PICKKEY) || "{}") as Record<string, string>;
      if (id) all[productId] = id; else delete all[productId];
      localStorage.setItem(PICKKEY, JSON.stringify(all));
    } catch { /* Nothing to persist. */ }
    onChoose?.(SONG_PICKS.find(s => s.id === id)?.name ?? "");
  };
  const song = SONG_PICKS.find(s => s.id === pick);
  const [thumb, setThumb] = useState("");
  useEffect(() => {
    setThumb("");
    if (!song) return;
    let current = true;
    fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${song.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (current && d?.thumbnail_url) setThumb(d.thumbnail_url as string); })
      .catch(() => { /* No thumbnail — the name link still shows. */ });
    return () => { current = false; };
  }, [song?.id]);
  return (
    <div className={`mlshop-songpick${compact ? " mlshop-songpick-card" : ""}`}>
      <label className="mlshop-songpick-label" htmlFor={`songpick-${productId}`}>Goes with a song</label>
      <select id={`songpick-${productId}`} className="genre-select" value={pick} onChange={e => choose(e.target.value)} aria-label={`Song that goes with this piece`}>
        <option value="">Pick a song…</option>
        {SONG_PICKS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {song && (
        <a className="mlshop-songpick-thumb" href={`https://open.spotify.com/track/${song.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Play ${song.name} on Spotify`}>
          {thumb && <img src={thumb} alt={`${song.name} album art`} loading="lazy" />}
          <span>{song.name}</span>
        </a>
      )}
    </div>
  );
}

function ShopDetail({ p, saved, onSave, onClose }: { p: CatalogProduct; saved: boolean; onSave: () => void; onClose: () => void }) {
  const [img, setImg] = useState(0);
  useEffect(() => setImg(0), [p.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const shown = p.images[img] ?? p.image;
  return (
    <div className="mlshop-modal" role="dialog" aria-modal="true" aria-label={p.name}>
      <button type="button" className="mlshop-modal-scrim" aria-label="Close" onClick={onClose} />
      <div className="mlshop-modal-panel">
        <button type="button" onClick={onClose} autoFocus className="mlshop-modal-close"><X aria-hidden className="h-3.5 w-3.5" />Close</button>
        <div className="mlshop-modal-body">
          <div>
            <ProductImage src={shown} alt={`${p.brand} ${p.name}${img ? `, view ${img + 1}` : ""}`} className="mlshop-modal-img" />
            {p.images.length > 1 && (
              <div className="mlshop-thumbs">
                {p.images.map((im, i) => (
                  <button key={im} type="button" onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`} aria-current={i === img} className={i === img ? "is-now" : undefined}><img src={im} alt="" /></button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mlshop-modal-kicker">{p.brand} · {p.category}</p>
            <h3 className="mlshop-modal-title">{p.name}</h3>
            <p className="mlshop-modal-price">{formatPrice(p.price, p.currency)}</p>
            <p className="mlshop-modal-avail">{AVAILABILITY_LABEL[p.availability]}</p>
            <p className="mlshop-modal-desc">{p.description}</p>
            <p className="mlshop-modal-spec"><strong>Sizes currently listed: </strong>{p.sizes.length ? p.sizes.join(", ") : "Not listed by retailer"}</p>
            <div className="mlshop-modal-actions">
              <button type="button" onClick={onSave} aria-pressed={saved} className="mlshop-save"><Heart aria-hidden className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save to wishlist"}</button>
              <a href={p.link} target="_blank" rel="noreferrer" className="mlshop-buy">Shop on Farfetch</a>
            </div>
            <SongPick productId={p.id} />
            <div className="mlshop-modal-ask">
              <h4>How would you style this—and what would you play?</h4>
              <p>Community styling comments, videos and song picks arrive once accounts are switched on. Song picks will be shown as personal interpretations, not verified connections.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
