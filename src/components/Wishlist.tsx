import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Download, X, Plus, Share2, Music2, Bookmark, Check, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { addWish, exportWishlist, removeWish, updateWish, useWishlist, type WishItem } from "@/lib/wishlist";
import { renderShareCard, shareOrDownload, SHARE_SIZES, type ShareFormat } from "@/lib/share-card";
import { searchTrackedEditorialEvidence } from "@/lib/melodylust.functions";
import tailoring from "@/assets/editorial-pick-1.jpg";
import heel from "@/assets/editorial-pick-2.jpg";
import suede from "@/assets/editorial-pick-3.jpg";
import patent from "@/assets/editorial-pick-4.jpg";
import silk from "@/assets/editorial-pick-5.jpg";
import silver from "@/assets/editorial-pick-6.jpg";

type RotationRow = { id: string; artist: string; song: string; expanded: boolean };
const ROTATION_KEY = "ml-want-rotation";
const previewLooks = [
  { id: "tailoring", title: "The sharp entrance", note: "Tailoring, a sculptural heel and a soft suede accent.", products: [{ name: "Tiger-print tailoring", image: tailoring }, { name: "Sculptural heel", image: heel }, { name: "Suede accent", image: suede }] },
  { id: "after-dark", title: "After the last track", note: "Patent shine, fluid silk and a little silver.", products: [{ name: "Patent accessory", image: patent }, { name: "Silk layer", image: silk }, { name: "Silver accent", image: silver }] },
];
type PreviewLook = typeof previewLooks[number];
type TrackerResponse = Awaited<ReturnType<typeof searchTrackedEditorialEvidence>>;

export function Wishlist() {
  const items = useWishlist();
  const nextRow = useRef(4);
  const returnToRotation = useRef(false);
  const [rotation, setRotation] = useState<RotationRow[]>([1, 2, 3].map(index => ({ id: `rotation-${index}`, artist: "", song: "", expanded: index === 1 })));
  const [styling, setStyling] = useState(false);
  const [signals, setSignals] = useState<{ name: string; response: TrackerResponse }[]>([]);
  const [message, setMessage] = useState("");
  const [selectedLook, setSelectedLook] = useState<PreviewLook | null>(null);
  const [promo, setPromo] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<ShareFormat | null>(null);
  const [kind, setKind] = useState<WishItem["kind"]>("piece");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const activeRotation = rotation.filter(row => row.artist.trim());

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(ROTATION_KEY) ?? "null");
      if (Array.isArray(stored) && stored.length > 0 && stored.length <= 10 && stored.every(row => row && typeof row.artist === "string" && row.artist.length <= 200 && typeof row.song === "string" && row.song.length <= 200 && typeof row.expanded === "boolean")) {
        setRotation(stored.map((row, index) => ({ id: `rotation-${index + 1}`, artist: row.artist, song: row.song, expanded: row.expanded })));
        nextRow.current = stored.length + 1;
      }
    } catch { setMessage("Your rotation could not be restored."); }
  }, []);

  const changeRotation = (rows: RotationRow[]) => {
    setRotation(rows); setSignals([]); setMessage("");
    try { window.localStorage.setItem(ROTATION_KEY, JSON.stringify(rows)); }
    catch { setMessage("Device storage is unavailable. This rotation will not survive a refresh."); }
  };
  const editRow = (id: string, patch: Partial<RotationRow>) => changeRotation(rotation.map(row => row.id === id ? { ...row, ...patch } : row));
  const saveLook = (look: PreviewLook) => {
    for (const product of look.products) addWish({ kind: "piece", name: product.name, detail: "Product placeholder", link: "", note: "Editorial preview; not a verified product or recommendation.", from: look.title });
    setMessage(`${look.title} saved to My Edit.`);
  };
  const isSaved = (look: PreviewLook) => look.products.every(product => items.some(item => item.kind === "piece" && item.name === product.name && item.from === look.title));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const url = link.trim() && !/^https?:\/\//i.test(link.trim()) ? `https://${link.trim()}` : link.trim();
    addWish({ kind, name: name.trim(), detail: detail.trim(), link: url, note: note.trim() });
    setName(""); setDetail(""); setLink(""); setNote("");
  };

  const col = (k: WishItem["kind"], title: string, empty: string) => {
    const list = items.filter(i => i.kind === k);
    return <div className="wish-col">
      <h3 className="wish-col-title">{title} <span>{String(list.length).padStart(2, "0")}</span></h3>
      {list.length === 0 ? <p className="wish-empty">{empty}</p> : <ol className="wish-list">{list.map((i, n) => <li key={i.id}>
        <span className="wish-num">{String(n + 1).padStart(2, "0")}</span>
        <div className="wish-body">
          <p className="wish-name">{i.link ? <a href={i.link} target="_blank" rel="noreferrer">{i.name} <ArrowUpRight /></a> : i.name}</p>
          {(i.detail || i.from) && <p className="wish-meta">{[i.detail, i.from && `for ${i.from}`].filter(Boolean).join(" · ")}</p>}
          <textarea className="wish-note" rows={1} placeholder="Add a reference, size, colour or thought…" defaultValue={i.note} onBlur={e => updateWish(i.id, { note: e.target.value })} aria-label={`Notes for ${i.name}`} />
        </div>
        <button type="button" className="wish-remove" onClick={() => removeWish(i.id)} aria-label={`Remove ${i.name}`}><X /></button>
      </li>)}</ol>}
    </div>;
  };

  return <section className="wishlist" id="wishlist" aria-label="Your wishlist">
    <header className="want-masthead">
      <div className="want-folio"><span>Stylus</span><span>Issue No. 010</span><span>Music + wardrobe</span></div>
      <h2 className="want-heading">The Want List</h2>
      <p className="want-deck">On repeat. In rotation. In your wardrobe.</p>
    </header>
    <form className="want-rotation" aria-label="Your rotation" onSubmit={async event => {
      event.preventDefault();
      if (styling || !activeRotation.length) return;
      setStyling(true); setSignals([]); setMessage("");
      try {
        const queries = [...new Set(activeRotation.map(row => row.song.trim() ? `${row.song.trim()} by ${row.artist.trim()}` : row.artist.trim()))];
        const responses: { name: string; response: TrackerResponse }[] = [];
        for (const query of queries) responses.push({ name: query, response: await searchTrackedEditorialEvidence({ data: { query } }) });
        setSignals(responses);
        for (const row of activeRotation) addWish({ kind: "song", name: row.song.trim() || row.artist.trim(), detail: row.song.trim() ? row.artist.trim() : "Artist rotation", link: `https://open.spotify.com/search/${encodeURIComponent(`${row.artist.trim()} ${row.song.trim()}`.trim())}`, note: "Added from your rotation. Spotify search, not a created playlist." });
        setMessage(responses.some(entry => entry.response.error) ? "Some tracker searches were unavailable. Your rotation is saved; product edits remain placeholders." : "Your rotation is saved. Product edits are editorial placeholders, not algorithmic product matches.");
      } catch { setMessage("The tracker is unavailable. Your rotation is kept on this device; please try again."); }
      finally { setStyling(false); }
    }}>
      <div className="want-section-label"><h3>I. Input / Your rotation</h3><span>{activeRotation.length} of 10</span></div>
      <div className="want-rows">
        {rotation.map((row, index) => <div className="want-row" key={row.id}>
          <span className="want-row-number">{String(index + 1).padStart(2, "0")}</span>
          <label className="want-artist" htmlFor={`${row.id}-artist`}><span>Artist</span><input id={`${row.id}-artist`} aria-label={`Artist ${index + 1}`} placeholder="Type an artist" value={row.artist} maxLength={200} disabled={styling} onChange={event => editRow(row.id, { artist: event.target.value })} /></label>
          <button className="want-song-toggle" type="button" aria-label={`${row.expanded ? 'Remove' : 'Add'} song for artist ${index + 1}`} aria-expanded={row.expanded} aria-controls={`${row.id}-song-panel`} disabled={styling} onClick={() => editRow(row.id, { expanded: !row.expanded, ...row.expanded ? { song: "" } : {} })}><Music2 aria-hidden="true" /><span>{row.expanded ? "Song" : "+ Song"}</span></button>
          <button className="want-icon-button" type="button" aria-label={`Remove artist ${index + 1}`} title={`Remove artist ${index + 1}`} disabled={styling || rotation.length === 1} onClick={() => changeRotation(rotation.filter(entry => entry.id !== row.id))}><X aria-hidden="true" /></button>
          {row.expanded && <div className="want-song-panel" id={`${row.id}-song-panel`}><label htmlFor={`${row.id}-song`}><span>Song / optional</span><input id={`${row.id}-song`} aria-label={`Song for artist ${index + 1}`} placeholder="Pick a specific track" value={row.song} maxLength={200} disabled={styling} onChange={event => editRow(row.id, { song: event.target.value })} /></label><a href={`https://open.spotify.com/search/${encodeURIComponent(`${row.artist} ${row.song}`.trim())}`} target="_blank" rel="noopener noreferrer" aria-label={`Find tracks for artist ${index + 1} on Spotify`}>Find a track <ArrowUpRight aria-hidden="true" /></a></div>}
        </div>)}
      </div>
      <div className="want-rotation-actions"><Button variant="outline" className="want-add" type="button" disabled={styling || rotation.length >= 10} onClick={() => changeRotation([...rotation, { id: `rotation-${nextRow.current++}`, artist: "", song: "", expanded: false }])}><Plus aria-hidden="true" />Add an artist</Button><Button className="want-primary" type="submit" disabled={styling || !activeRotation.length}>{styling ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}{styling ? "Reading the tracker" : "Style my list"}</Button></div>
    </form>
    {message && <p className="want-status" role="status">{message}</p>}
    <section className="want-output" aria-labelledby="want-output-heading" aria-busy={styling}>
      <div className="want-section-label"><h3 id="want-output-heading">II. Output / {signals.length ? "Your editorial edit" : "Preview edit"}</h3><span>02 looks</span></div>
      <div className="want-output-grid">
        {previewLooks.map((look, index) => <article className="want-look" key={look.id}>
          <button type="button" className="want-look-image" onClick={() => setSelectedLook(look)} aria-label={`View ${look.title} pieces`}><img src={look.products[0]!.image} alt={`${look.products[0]!.name} product placeholder`} loading="lazy" /><span>Product placeholder</span><ArrowUpRight aria-hidden="true" /></button>
          <div className="want-look-meta"><span>Look {String(index + 1).padStart(2, "0")}</span><span>Editorial preview</span></div>
          <h4>{look.title}</h4><p>{look.note}</p>
          <div className="want-look-products">{look.products.slice(1).map(product => <button type="button" key={product.name} onClick={() => setSelectedLook(look)} aria-label={`View ${product.name} placeholder`}><img src={product.image} alt={product.name} loading="lazy" /></button>)}</div>
          <div className="want-look-actions"><button type="button" onClick={() => setSelectedLook(look)}>View pieces <ArrowUpRight aria-hidden="true" /></button><button type="button" onClick={() => saveLook(look)} disabled={isSaved(look)} aria-label={`Save ${look.title}`} title={`Save ${look.title}`}>{isSaved(look) ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}</button></div>
        </article>)}
        <aside className="want-playlist" aria-labelledby="want-playlist-heading">
          <div className="want-playlist-heading"><h3 id="want-playlist-heading">Playlist</h3><span>{activeRotation.length} entries</span></div>
          {!activeRotation.length ? <p className="want-playlist-empty">Nothing on repeat yet.</p> : <ol>{activeRotation.map((row, index) => <li key={row.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{row.song.trim() || row.artist.trim()}</strong>{row.song.trim() && <p>{row.artist}</p>}</div><a href={`https://open.spotify.com/search/${encodeURIComponent(`${row.artist} ${row.song}`.trim())}`} target="_blank" rel="noopener noreferrer" aria-label={`Find ${row.song.trim() || row.artist.trim()} on Spotify`} title="Find on Spotify"><ArrowUpRight aria-hidden="true" /></a></li>)}</ol>}
          <p className="want-playlist-note">Your rotation / Spotify search links</p>
          <Button variant="outline" className="want-playlist-export" disabled={!activeRotation.length} onClick={() => exportWishlist(activeRotation.map(row => ({ id: row.id, kind: "song", name: row.song.trim() || row.artist.trim(), detail: row.artist.trim(), link: `https://open.spotify.com/search/${encodeURIComponent(`${row.artist} ${row.song}`.trim())}`, note: "" })), "txt")}><Download aria-hidden="true" />Export rotation</Button>
        </aside>
      </div>
      {signals.length > 0 && <div className="want-signals"><h4>From the article tracker</h4>{signals.map(({ name: signalName, response }) => <div key={signalName}><h5>{signalName}</h5>{response.error ? <p>{response.error}</p> : response.articles.length === 0 ? <p>No {response.result?.intent.music_kind ?? "music"}-level source in the tracker. No hierarchy fallback.</p> : response.articles.map(article => <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer">{article.title}<ArrowUpRight aria-hidden="true" /></a>)}</div>)}</div>}
    </section>
    <section className="want-saved" aria-label="Saved edit">
    <div className="want-section-label"><h3>III. Saved / My Edit</h3><span>{items.length} saved</span></div>
    <details className="want-custom"><summary><Plus aria-hidden="true" />Add a piece or song</summary>
    <form className="wish-form" onSubmit={submit}>
      <div className="wish-kind" role="radiogroup" aria-label="What are you adding?">
        {(["piece", "song"] as const).map(k => <button key={k} type="button" role="radio" aria-checked={kind === k} data-on={kind === k || undefined} onClick={() => setKind(k)}>{k === "piece" ? "A piece" : "A song"}</button>)}
      </div>
      <input className="wish-input" value={name} onChange={e => setName(e.target.value)} placeholder={kind === "piece" ? "Name — e.g. Black slip dress" : "Song — e.g. Heart of Glass"} aria-label="Name" required />
      <input className="wish-input" value={detail} onChange={e => setDetail(e.target.value)} placeholder={kind === "piece" ? "Brand or price" : "Artist"} aria-label="Detail" />
      <input className="wish-input" value={link} onChange={e => setLink(e.target.value)} placeholder="Link (shop, Spotify, Pinterest…)" aria-label="Link" inputMode="url" />
      <input className="wish-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Reference or note" aria-label="Note" />
      <Button type="submit" variant="soundCta"><Plus /> Add</Button>
    </form>
    </details>
    <div className="wish-grid">
      {col("piece", "Pieces", "Tap the bag on a featured song to save pieces here.")}
      {col("song", "Saved tracks", "No saved tracks yet.")}
    </div>
    <div className="wish-export">
      <Button variant="outline" disabled={!items.length} onClick={() => exportWishlist(items, "txt")}><Download /> Export list</Button>
      <Button variant="outline" disabled={!items.length} onClick={() => exportWishlist(items, "csv")}><Download /> Spreadsheet (CSV)</Button>
    </div>
    <div className="wish-export" aria-label="Share as an image">
      {(Object.keys(SHARE_SIZES) as ShareFormat[]).map(f => <Button key={f} variant="outline" disabled={!items.length || busy !== null} onClick={async () => {
        setBusy(f);
        try { await shareOrDownload(await renderShareCard(items, f), f); }
        catch { setMessage("The share image could not be created. Export your list instead."); }
        finally { setBusy(null); }
      }}><Share2 /> {busy === f ? "Making…" : `Share · ${SHARE_SIZES[f].label}`}</Button>)}
    </div>
    <form className="want-email" aria-label="Email your edit" onSubmit={event => {
      event.preventDefault();
      if (!items.length) return;
      const body = items.map(item => `${item.name}${item.detail ? ` / ${item.detail}` : ""}\n${item.link}\n${item.note}`).join("\n\n");
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("My Want List")}&body=${encodeURIComponent(body)}`;
    }}><label htmlFor="want-email">Email my edit</label><input id="want-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /><Button variant="outline" type="submit" disabled={!items.length}><Mail aria-hidden="true" />Open email</Button></form>
    </section>
    <footer className="want-footer"><span>Stylus / Your personal edit</span><a href="#styling-notes">Share your Styling Notes <ArrowUpRight aria-hidden="true" /></a><button type="button" onClick={() => setPromo(true)}>Next issue <ArrowUpRight aria-hidden="true" /></button></footer>
    <Dialog open={selectedLook !== null} onOpenChange={open => { if (!open) setSelectedLook(null); }}><DialogContent className="want-product-dialog">
      <DialogTitle>{selectedLook?.title}</DialogTitle><DialogDescription>Product placeholders. No verified brand, price or availability.</DialogDescription>
      <div className="want-dialog-products">{selectedLook?.products.map(product => <figure key={product.name}><img src={product.image} alt={`${product.name} product placeholder`} /><figcaption>{product.name}</figcaption></figure>)}</div>
      <Button className="want-primary" disabled={selectedLook ? isSaved(selectedLook) : true} onClick={() => { if (selectedLook) saveLook(selectedLook); }}><Bookmark aria-hidden="true" />{selectedLook && isSaved(selectedLook) ? "Saved to My Edit" : "Save this edit"}</Button>
    </DialogContent></Dialog>
    <Dialog open={promo} onOpenChange={setPromo}><DialogContent className="want-promo-dialog" onCloseAutoFocus={event => { if (returnToRotation.current) { event.preventDefault(); returnToRotation.current = false; document.getElementById(`${rotation[0]?.id}-artist`)?.focus(); } }}><img src={silk} alt="Silk product placeholder for the next editorial edit" /><div><span className="want-promo-kicker">The next rotation / Editorial preview</span><DialogTitle>One more on repeat.</DialogTitle><DialogDescription>A new rotation, a fresh personal edit.</DialogDescription><Button className="want-primary" onClick={() => { returnToRotation.current = true; setPromo(false); }}><Plus aria-hidden="true" />Edit my rotation</Button></div></DialogContent></Dialog>
  </section>;
}

