import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Link2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/lib/wishlist";
import { sectionOf } from "@/lib/style-board";
import { toBoardItems } from "@/lib/style-board";
import { createStyleBoard } from "@/lib/style-board.functions";
import { AuthDialog } from "@/components/StylingNotes";

const LABEL = { fashion: "Fashion", music: "Music", read: "Good reads" } as const;

/** Build a shareable board: a style note plus picks from the Want List. */
export function StyleBoardComposer() {
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
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = items.filter(i => picked.has(i.id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) return setAuthOpen(true);
    if (!chosen.length) return setStatus("Pick at least one item from your Want List.");
    setBusy(true); setStatus("");
    try {
      const { id } = await create({ data: { ...form, items: toBoardItems(chosen) } });
      setLink(`${window.location.origin}/board/${id}`);
    } catch (err) { setStatus(err instanceof Error ? err.message : "Your board couldn't be saved."); }
    finally { setBusy(false); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: form.title, url: link }); return; } catch { /* fall back to copy */ } }
    await navigator.clipboard?.writeText(link); setStatus("Link copied.");
  };
  return <section className="ls-board-make" aria-labelledby="ls-board-make-title">
    <h2 id="ls-board-make-title">Share a style board</h2>
    <p>Write a style note, pick fashion, music and good reads from your Want List, and get a link anyone can open.</p>
    {link ? <div className="ls-board-done" role="status">
      <p><Check aria-hidden /> Your board is live.</p>
      <a href={link} className="ls-board-link">{link}</a>
      <div className="ls-board-row">
        <Button variant="listenSolid" size="bar" onClick={() => void share()}><Link2 aria-hidden />Share link</Button>
        <Button variant="listenOutline" size="bar" onClick={() => { setLink(""); setPicked(new Set()); setForm(f => ({ ...f, title: "", note: "" })); }}>Make another</Button>
      </div>
    </div> : <form onSubmit={e => void submit(e)} className="ls-board-form">
      <label>Your name<input required maxLength={60} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></label>
      <label>Board title<input required minLength={3} maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sunday record-shop fit" /></label>
      <label>Style note<textarea required minLength={10} maxLength={2000} rows={4} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="How you'd wear it, and why the songs fit." /></label>
      <fieldset><legend>From your Want List</legend>
        {!items.length && <p>Your Want List is empty — save pieces, songs or good reads first.</p>}
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
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} tone="room" onSignedIn={async () => setSignedIn(true)} />
  </section>;
}
