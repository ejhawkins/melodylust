import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Music2, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onWishAdded, removeWish, useWishlist } from "@/lib/wishlist";
import { renderShareCard, shareOrDownload, SHARE_SIZES, type ShareFormat } from "@/lib/share-card";

/** The visitor's Want List inline in the Listening Room feed: saved pieces and songs, with social share cards. */
export function ListenWantShelf({ onOpen }: { onOpen: () => void }) {
  const items = useWishlist();
  const ref = useRef<HTMLElement>(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState<ShareFormat | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = onWishAdded(({ item, duplicate }) => {
      setFlash(duplicate ? `${item.name} is already on your Want List.` : `${item.name} added to your Want List.`);
      clearTimeout(t); t = setTimeout(() => setFlash(""), 4000);
    });
    return () => { off(); clearTimeout(t); };
  }, []);
  const pieces = [...items].reverse().filter(i => i.kind === "piece");
  const songs = [...items].reverse().filter(i => i.kind === "song");
  const share = async (f: ShareFormat) => {
    setBusy(f);
    try { await shareOrDownload(await renderShareCard(items, f), f); } finally { setBusy(null); }
  };
  return <section ref={ref} className="ls-want-shelf" aria-labelledby="ls-want-shelf-title" data-flash={flash ? true : undefined}>
    <div className="ls-want-shelf-head">
      <h2 id="ls-want-shelf-title">+ Your Want List</h2>
      <span>{pieces.length} {pieces.length === 1 ? "look" : "looks"} · {songs.length} {songs.length === 1 ? "song" : "songs"}</span>
    </div>
    <p className="ls-want-shelf-status" role="status">{flash}</p>
    {items.length === 0
      ? <p className="ls-want-shelf-empty">Search a look or tap Save on a product, and it lands here.</p>
      : <>
        {pieces.length > 0 && <ul className="ls-want-shelf-pieces">{pieces.map(p => <li key={p.id}>
          {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <div className="ls-want-shelf-swatch" aria-hidden="true">{p.name.slice(0, 1)}</div>}
          <div><strong>{p.name}</strong>{p.detail && <small>{p.detail}</small>}</div>
          <div className="ls-want-shelf-actions">
            {p.link && <a href={p.link} target="_blank" rel="noreferrer" aria-label={`Open ${p.name}`}><ArrowUpRight /></a>}
            <button type="button" className="ls-want-shelf-icon" aria-label={`Remove ${p.name}`} onClick={() => removeWish(p.id)}><Trash2 /></button>
          </div>
        </li>)}</ul>}
        {songs.length > 0 && <ol className="ls-want-shelf-songs">{songs.map(s => <li key={s.id}>
          <Music2 aria-hidden="true" /><span><strong>{s.name}</strong>{s.detail && <small>{s.detail}</small>}</span>
          <button type="button" className="ls-want-shelf-icon" aria-label={`Remove ${s.name}`} onClick={() => removeWish(s.id)}><Trash2 /></button>
        </li>)}</ol>}
      </>}
    <div className="ls-want-shelf-share" role="group" aria-label="Share your Want List">
      {(Object.keys(SHARE_SIZES) as ShareFormat[]).map(f => <Button key={f} variant="outline" size="sm" disabled={!items.length || busy !== null} onClick={() => share(f)}>
        <Share2 />{busy === f ? "Making…" : `Share · ${SHARE_SIZES[f].label}`}
      </Button>)}
      <Button variant="ghost" size="sm" onClick={onOpen}>Open full Want List</Button>
    </div>
  </section>;
}
