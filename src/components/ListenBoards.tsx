import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StyleBoardComposer } from "@/components/StyleBoardComposer";
import { AuthDialog } from "@/components/StylingNotes";
import { StylistProfileEditor } from "@/components/StylistProfileEditor";
import { deleteStyleBoard, getBoardWorkspace, listStyleBoards, reviewStyleBoard, type MyBoard, type StyleBoard } from "@/lib/style-board.functions";

type Workspace = Awaited<ReturnType<typeof getBoardWorkspace>>;
const STATUS = { pending: "In review", approved: "Live", rejected: "Not approved" } as const;
const count = (b: StyleBoard) => {
  const n = (s: string) => b.items.filter(i => i.section === s).length;
  return [n("fashion") && `${n("fashion")} fashion`, n("music") && `${n("music")} music`, n("read") && `${n("read")} reads`].filter(Boolean).join(" · ");
};
const cover = (b: StyleBoard) => b.items.find(i => i.image)?.image;

async function shareLink(b: StyleBoard) {
  const url = `${window.location.origin}/board/${b.id}`;
  if (navigator.share) { try { await navigator.share({ title: b.title, url }); return "Shared."; } catch { /* copy instead */ } }
  await navigator.clipboard?.writeText(url); return "Link copied.";
}

/** The Listening Room "Boards" tab: approved community boards, the composer, your own boards and the review queue. */
export function ListenBoards() {
  const list = useServerFn(listStyleBoards);
  const load = useServerFn(getBoardWorkspace);
  const review = useServerFn(reviewStyleBoard);
  const remove = useServerFn(deleteStyleBoard);
  const [boards, setBoards] = useState<StyleBoard[]>([]);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);
  const refresh = useCallback(async () => {
    setBoards((await list()).boards);
    const { data } = await supabase.auth.getSession();
    setEmail(data.session?.user.email ?? null);
    if (data.session) { try { setWs(await load()); } catch { setWs(null); } } else setWs(null);
  }, [list, load]);
  useEffect(() => { void refresh(); }, [refresh]);
  const decide = async (b: MyBoard, decision: "approved" | "rejected") => {
    const reason = decision === "rejected" ? window.prompt("Why isn't this board approved? The author will see this.")?.trim() : undefined;
    if (decision === "rejected" && !reason) return;
    try { await review({ data: { id: b.id, decision, ...(reason ? { reason } : {}) } }); setMsg(decision === "approved" ? `“${b.title}” is live.` : `“${b.title}” was sent back.`); await refresh(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Review failed."); }
  };
  return <section className="ls-section ls-boards" id="style-boards" aria-labelledby="ls-boards-title">
    <h2 id="ls-boards-title" className="ls-boards-title">Style boards</h2>
    <p className="ls-boards-dek">Outfits with their soundtrack and reading list, posted by readers and reviewed before they go public.</p>
    <div className="ls-boards-account">
      {email ? <><span>Signed in as {email}{ws?.canModerate ? " · reviewer" : ""}</span>
        <Button variant="listenOutline" size="chip" onClick={() => void supabase.auth.signOut().then(refresh)}>Sign out</Button></>
      : <><Button variant="listenSolid" size="chip" onClick={() => setAuthOpen("signup")}>Create account</Button>
        <Button variant="listenOutline" size="chip" onClick={() => setAuthOpen("signin")}>Sign in</Button></>}
    </div>
    <AuthDialog open={Boolean(authOpen)} initialMode={authOpen || "signin"} onOpenChange={o => { if (!o) setAuthOpen(false); }} tone="room" onSignedIn={refresh} />
    {msg && <p role="status" className="ls-boards-msg">{msg}</p>}

    {boards.length ? <ul className="ls-boards-grid">{boards.map(b => <li key={b.id} className="ls-boards-card">
      {cover(b) ? <img src={cover(b)} alt="" loading="lazy" width={320} height={320} /> : <div className="ls-boards-noimg" aria-hidden />}
      <div><a href={`/board/${b.id}`} className="ls-boards-card-title">{b.title}</a><p>by <a href={`/influencer/${b.id}`} className="underline">{b.author}</a> · {count(b)}</p></div>
      <Button variant="listenOutline" size="chip" onClick={() => void shareLink(b).then(setMsg)}><Link2 aria-hidden />Share</Button>
    </li>)}</ul> : <p className="ls-boards-empty">No boards are live yet — post the first one.</p>}

    <StyleBoardComposer key={email ?? "out"} onCreated={() => void refresh()} />

    {email && <StylistProfileEditor key={email} />}

    {ws && ws.mine.length > 0 && <div className="ls-boards-mine"><h3>Your boards</h3><ul>{ws.mine.map(b => <li key={b.id}>
      <div><p className="ls-boards-card-title">{b.title}</p><p>{STATUS[b.status]}{b.status === "rejected" && b.rejectionReason ? ` — ${b.rejectionReason}` : ""}</p></div>
      <div className="ls-board-row">
        {b.status === "approved" && <Button variant="listenOutline" size="chip" onClick={() => void shareLink(b).then(setMsg)}><Link2 aria-hidden />Share</Button>}
        <Button variant="listenOutline" size="chip" aria-label={`Delete ${b.title}`} onClick={() => { if (window.confirm("Delete this board?")) void remove({ data: { id: b.id } }).then(refresh); }}><Trash2 aria-hidden /></Button>
      </div>
    </li>)}</ul></div>}

    {ws?.canModerate && <div className="ls-boards-mine"><h3>Review queue ({ws.queue.length})</h3>
      {!ws.queue.length && <p>Nothing waiting.</p>}
      <ul>{ws.queue.map(b => <li key={b.id} className="ls-boards-review">
        <div><p className="ls-boards-card-title">{b.title}</p><p>by {b.author} · {count(b)}</p><p className="ls-boards-note">{b.note}</p>
          <ul className="ls-boards-items">{b.items.map((i, n) => <li key={n}>{i.section}: {i.name}</li>)}</ul></div>
        <div className="ls-board-row">
          <Button variant="listenSolid" size="chip" onClick={() => void decide(b, "approved")}>Approve</Button>
          <Button variant="listenOutline" size="chip" onClick={() => void decide(b, "rejected")}>Send back</Button>
        </div>
      </li>)}</ul>
    </div>}
  </section>;
}
