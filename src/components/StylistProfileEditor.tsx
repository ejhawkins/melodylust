import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyStylistProfile, saveMyStylistProfile } from "@/lib/style-board.functions";
import type { PortfolioPiece } from "@/lib/style-board";

/** Signed-in stylists write their bio, inspirations and portfolio; shown on their public stylist page. */
export function StylistProfileEditor() {
  const load = useServerFn(getMyStylistProfile); const save = useServerFn(saveMyStylistProfile);
  const [bio, setBio] = useState(""); const [insp, setInsp] = useState(""); const [items, setItems] = useState<PortfolioPiece[]>([]);
  const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { void load().then(p => { setBio(p.bio); setInsp(p.inspirations); setItems(p.portfolio); }).catch(() => undefined); }, [load]);
  const edit = (n: number, k: keyof PortfolioPiece, v: string) => setItems(l => l.map((p, i) => i === n ? { ...p, [k]: v } : p));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setStatus("");
    try { await save({ data: { bio, inspirations: insp, portfolio: items } }); setStatus("Profile saved. It shows on your stylist page once a board is approved."); }
    catch (err) { setStatus(err instanceof Error ? err.message : "Couldn't save."); } finally { setBusy(false); }
  };
  return <form className="ls-board-make ls-board-form" onSubmit={e => void submit(e)} aria-labelledby="ls-sp-title">
    <h3 id="ls-sp-title">Your stylist profile</h3>
    <label>Bio — your style, in your words<textarea maxLength={1200} rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Vintage tailoring, loud socks, always dressed for the encore." /></label>
    <label>Inspirations<textarea maxLength={600} rows={2} value={insp} onChange={e => setInsp(e.target.value)} placeholder="Grace Jones, Northern Soul all-nighters, my nan's wardrobe." /></label>
    <fieldset className="ls-sp-portfolio"><legend>Portfolio (up to 12)</legend>
      {items.map((p, n) => <div key={n} className="ls-sp-piece">
        <label>Title<input maxLength={80} value={p.title} onChange={e => edit(n, "title", e.target.value)} /></label>
        <label>Photo link (https)<input type="url" value={p.image} onChange={e => edit(n, "image", e.target.value)} placeholder="https://…" /></label>
        <label>Link (optional)<input type="url" value={p.link} onChange={e => edit(n, "link", e.target.value)} placeholder="https://…" /></label>
        <Button type="button" variant="listenOutline" size="chip" aria-label={`Remove ${p.title || "piece"}`} onClick={() => setItems(l => l.filter((_, i) => i !== n))}><Trash2 aria-hidden /></Button>
      </div>)}
      {items.length < 12 && <Button type="button" variant="listenOutline" size="chip" onClick={() => setItems(l => [...l, { title: "", image: "", link: "" }])}><Plus aria-hidden />Add portfolio piece</Button>}
    </fieldset>
    {status && <p role="status">{status}</p>}
    <Button type="submit" variant="listenSolid" size="bar" disabled={busy}>Save profile</Button>
  </form>;
}
