import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, LoaderCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { addWish, useWishlist } from "@/lib/wishlist";
import { formatPrice, type ShopProduct } from "@/lib/farfetch";
import { lookupProducts } from "@/lib/products.functions";
import { getSpotifyTrack } from "@/lib/spotify-track.functions";
import { sectionOf, spotifyTrackId, toBoardItems, type BoardSection } from "@/lib/style-board";
import { createStyleBoard } from "@/lib/style-board.functions";
import { AuthDialog } from "@/components/StylingNotes";

const LABEL = { fashion: "Fashion", music: "Music", read: "Good reads" } as const;
// What the add-an-item row asks for in each section, and how the item is filed in the Want List so sectionOf reads it back.
const ADD: Record<BoardSection, { name: string; link: string; kind: "piece" | "song"; from: string }> = {
  fashion: { name: "Piece, e.g. Black leather trench", link: "Shop link (optional)", kind: "piece", from: "Style board" },
  music: { name: "Song — Artist", link: "Spotify song link (adds the cover and a player)", kind: "song", from: "Style board" },
  read: { name: "Article title", link: "Article link (optional)", kind: "piece", from: "Good read · Style board" },
};
const isHttps = (v: string) => /^https:\/\/[^\s]+$/i.test(v);

/** Build a shareable board: a style note plus picks from the Want List. */
export function StyleBoardComposer({ onCreated }: { onCreated?: () => void }) {
  const items = useWishlist();
  const create = useServerFn(createStyleBoard);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ displayName: "", title: "", note: "" });
  const [signedIn, setSignedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [link, setLink] = useState("");
  useEffect(() => {
    void supabase.auth.getSession().then(r => setSignedIn(Boolean(r.data.session)));
    const { data } = supabase.auth.onAuthStateChange(e => { if (e === "SIGNED_IN" || e === "SIGNED_OUT") setSignedIn(e === "SIGNED_IN"); });
    return () => data.subscription.unsubscribe();
  }, []);
  // Add an item right here: it is saved to the Want List (so it stays for next time) and ticked for this board.
  const findProducts = useServerFn(lookupProducts);
  const findTrack = useServerFn(getSpotifyTrack);
  const [draft, setDraft] = useState<{ section: BoardSection; name: string; link: string; image: string }>({ section: "fashion", name: "", link: "", image: "" });
  const [adding, setAdding] = useState(false);
  const [shop, setShop] = useState<{ q: string; state: "idle" | "loading" | "done" | "error"; products: ShopProduct[] }>({ q: "", state: "idle", products: [] });
  const justAdded = useRef<string[]>([]);
  useEffect(() => {
    if (!justAdded.current.length) return;
    const ids = items.filter(i => justAdded.current.includes(i.name)).map(i => i.id);
    if (ids.length) { justAdded.current = []; setPicked(p => new Set([...p, ...ids])); }
  }, [items]);
  const put = (section: BoardSection, item: { name: string; detail?: string; link?: string; image?: string }) => {
    const how = ADD[section];
    const name = item.name.trim().slice(0, 160);
    justAdded.current = [...justAdded.current, name];
    addWish({ kind: how.kind, name, detail: item.detail ?? "", link: item.link ?? "", note: "", from: how.from, ...(item.image ? { image: item.image } : {}) });
  };
  const addItem = async () => {
    const name = draft.name.trim(), link = draft.link.trim(), image = draft.image.trim();
    if (link && !/^https?:\/\//i.test(link)) return setStatus("Links start with https://");
    if (image && !isHttps(image)) return setStatus("Picture links start with https://");
    // A Spotify song link brings its own title, artist and cover, and plays on the board.
    const track = draft.section === "music" ? spotifyTrackId(link) : null;
    if (track) {
      setAdding(true); setStatus("");
      try {
        const song = await findTrack({ data: { id: track } });
        put("music", song ? { name: `${song.title} — ${song.artist}`, link: song.url, ...(song.art ? { image: song.art } : {}) } : { name: name || "Spotify song", link });
        setDraft(d => ({ ...d, name: "", link: "", image: "" }));
      } catch { setStatus("That song couldn’t be read from Spotify. Type its name instead."); }
      finally { setAdding(false); }
      return;
    }
    if (!name) return setStatus(draft.section === "music" ? "Paste a Spotify song link, or type the song and artist." : "Give the item a name first.");
    put(draft.section, { name, link, image });
    setDraft(d => ({ ...d, name: "", link: "", image: "" })); setStatus("");
  };
  // Real pieces with their photos, from the same shop search the rest of the site uses. One search per press.
  const searchShop = async () => {
    const item = shop.q.toLowerCase().replace(/[^a-z -]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!/^[a-z]/.test(item)) return setStatus("Type a piece to look for, like leather trench.");
    setShop(v => ({ ...v, state: "loading", products: [] })); setStatus("");
    try { const r = await findProducts({ data: { item, limit: 6 } }); setShop(v => ({ ...v, state: r.status === "ok" ? "done" : "error", products: r.products })); }
    catch { setShop(v => ({ ...v, state: "error", products: [] })); }
  };
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = items.filter(i => picked.has(i.id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) return setAuthOpen(true);
    if (!chosen.length) return setStatus("Pick at least one item from your Want List.");
    setBusy(true); setStatus("");
    try {
      const { id } = await create({ data: { ...form, items: toBoardItems(chosen) } });
      setLink(`${window.location.origin}/board/${id}`); onCreated?.();
    } catch (err) { setStatus(err instanceof Error ? err.message : "Your board couldn't be saved."); }
    finally { setBusy(false); }
  };
  return <section className="ls-board-make" aria-labelledby="ls-board-make-title">
    <h2 id="ls-board-make-title">Share a style board</h2>
    <p>Write a style note, pick fashion, music and good reads from your Want List, and send it for review. Once approved, it gets a link anyone can open.</p>
    {link ? <div className="ls-board-done" role="status">
      <p><Check aria-hidden /> Sent for review. Your link works once a moderator approves it:</p>
      <span className="ls-board-link">{link}</span>
      <div className="ls-board-row">
        <Button variant="listenOutline" size="bar" onClick={() => { setLink(""); setPicked(new Set()); setForm(f => ({ ...f, title: "", note: "" })); }}>Make another</Button>
      </div>
    </div> : <form onSubmit={e => void submit(e)} className="ls-board-form">
      <label>Your name<input required maxLength={60} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></label>
      <label>Board title<input required minLength={3} maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sunday record-shop fit" /></label>
      <label>Style note<textarea required minLength={10} maxLength={2000} rows={4} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="How you'd wear it, and why the songs fit." /></label>
      <fieldset><legend>On the board</legend>
        <div className="ls-board-add" role="group" aria-label="Add an item">
          <div className="ls-board-tabs" role="radiogroup" aria-label="Section">
            {(["fashion", "music", "read"] as const).map(sec => <Button key={sec} type="button" size="chip" variant={draft.section === sec ? "listenSolid" : "listenOutline"} role="radio" aria-checked={draft.section === sec} onClick={() => setDraft(d => ({ ...d, section: sec }))}>{LABEL[sec]}</Button>)}
          </div>
          {draft.section === "fashion" && <div className="ls-board-shop">
            <label>Find a piece with its photo<input value={shop.q} maxLength={60} placeholder="leather trench" enterKeyHint="search" onChange={e => setShop(v => ({ ...v, q: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void searchShop(); } }} /></label>
            <Button type="button" variant="listenOutline" size="bar" disabled={shop.state === "loading"} onClick={() => void searchShop()}>{shop.state === "loading" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Search aria-hidden />}Search the shop</Button>
            {shop.state === "error" && <p role="status">The shop isn’t answering right now. Add the piece by hand below.</p>}
            {shop.state === "done" && !shop.products.length && <p role="status">Nothing matched. Try a simpler word, or add it by hand below.</p>}
            {shop.products.length > 0 && <ul className="ls-board-results">{shop.products.map(pr => {
              const title = `${pr.brand} ${pr.name}`.slice(0, 160);
              const on = items.some(i => i.name === title);
              return <li key={pr.id}><button type="button" disabled={on} aria-label={`Add ${title} to the board`} onClick={() => put("fashion", { name: title, detail: formatPrice(pr.price, pr.currency), link: pr.link, image: pr.image })}>
                <img src={pr.image} alt="" loading="lazy" width={120} height={160} />
                <span><strong>{pr.brand}</strong> {pr.name}</span><em>{on ? "Added" : formatPrice(pr.price, pr.currency)}</em>
              </button></li>;
            })}</ul>}
            <p className="ls-board-or">Or add your own</p>
          </div>}
          <label>{draft.section === "music" ? "Song" : draft.section === "read" ? "Article" : "Piece"}<input maxLength={160} value={draft.name} placeholder={ADD[draft.section].name} onChange={e => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addItem(); } }} /></label>
          <label>Link<input type="url" inputMode="url" maxLength={500} value={draft.link} placeholder={ADD[draft.section].link} onChange={e => setDraft({ ...draft, link: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addItem(); } }} /></label>
          {draft.section !== "music" && <label>Picture link<input type="url" inputMode="url" maxLength={500} value={draft.image} placeholder="https://… (optional)" onChange={e => setDraft({ ...draft, image: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addItem(); } }} /></label>}
          <Button type="button" variant="listenOutline" size="bar" disabled={adding} onClick={() => void addItem()}>{adding ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}Add to board</Button>
        </div>
        {!items.length && <p>Nothing here yet. Add an item above, or save pieces, songs and good reads around the site and they’ll show up here to tick.</p>}
        {(["fashion", "music", "read"] as const).map(s => {
          const group = items.filter(i => sectionOf(i) === s);
          return group.length ? <div key={s} className="ls-board-group"><p>{LABEL[s]}</p>
            {group.map(i => <label key={i.id} className="ls-board-pick"><input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} />
              {i.image && <img src={i.image} alt="" loading="lazy" width={40} height={40} />}<span>{i.name}</span></label>)}
          </div> : null;
        })}
      </fieldset>
      {status && <p role="status">{status}</p>}
      <Button type="submit" variant="listenSolid" size="bar" disabled={busy}>{busy && <LoaderCircle className="animate-spin" aria-hidden />}{signedIn ? `Create link (${chosen.length})` : "Sign in to create link"}</Button>
    </form>}
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} tone="room" onSignedIn={async () => { setSignedIn(true); onCreated?.(); }} />
  </section>;
}
