import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, Check, Download, Link2, LogOut, Music2, Pencil, Trash2, X } from "lucide-react";
import logoImage from "@/assets/melody-lust-logo.png";
import { Button } from "@/components/ui/button";
import { AiPlaylistPanel } from "@/components/AiPlaylistPanel";
import { MusicLibraryPanel } from "@/components/MusicLibraryPanel";
import { StyleProfileQuiz } from "@/components/StyleProfileQuiz";
import { AuthDialog } from "@/components/StylingNotes";
import { supabase } from "@/integrations/supabase/client";
import { NOTE_STATUS, dossierRole, dossierStats, editFromHash, memberSince, shareLink, styleDna, wantListPairs, type NoteStatus } from "@/lib/dossier";
import { updateDisplayName } from "@/lib/profile.functions";
import { getStylingNotesWorkspace } from "@/lib/styling-notes.functions";
import { useStyleProfile } from "@/lib/use-style-profile";
import { addWish, clearWishlist, exportWishlist, removeWish, useWishlist, type WishItem } from "@/lib/wishlist";

export const DOSSIER_TABS = [
  { id: "edits", label: "Want list & edits" },
  { id: "library", label: "Music library" },
  { id: "playlist", label: "AI playlist" },
  { id: "dna", label: "Style DNA" },
  { id: "notes", label: "My styling notes" },
  { id: "account", label: "Account" },
] as const;
export type DossierTab = typeof DOSSIER_TABS[number]["id"];

type Workspace = Awaited<ReturnType<typeof getStylingNotesWorkspace>>;

/**
 * The Curator Dossier (/profile): who the reader is, what they've saved and how they dress,
 * and what they've sent to Styling Notes. The Want List, music library and Style DNA live on this
 * device and work signed out; notes and the account need a sign-in.
 */
export function CuratorDossier({ tab, onTabChange }: { tab: DossierTab; onTabChange: (tab: DossierTab) => void }) {
  const wishes = useWishlist();
  const { profile, save, clear } = useStyleProfile();
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notesState, setNotesState] = useState<"idle" | "loading" | "error">("idle");
  const [authOpen, setAuthOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) setSession(data.session); }).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const loadWorkspace = async () => {
    setNotesState("loading");
    try { setWorkspace(await getStylingNotesWorkspace()); setNotesState("idle"); }
    catch { setWorkspace(null); setNotesState("error"); }
  };
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) void loadWorkspace(); else setWorkspace(null);
  }, [userId]);

  const name = session ? workspace?.displayName || "Curator" : "Guest";
  const role = session ? dossierRole({ canModerate: workspace?.canModerate ?? false, notes: workspace?.own.length ?? 0 }) : "Reader";
  const stats = dossierStats({ wishes, notes: session ? workspace?.own ?? null : null, profile });
  const rename = async (displayName: string) => {
    const { displayName: saved } = await updateDisplayName({ data: { displayName } });
    setWorkspace(w => (w ? { ...w, displayName: saved } : w));
  };

  return <main className="dossier">
    <header className="dossier-masthead">
      <a href="/" className="dossier-back"><ArrowLeft aria-hidden /> Back to the journal</a>
      <a href="/" aria-label="Melody Lust home" className="brand"><img src={logoImage} alt="" className="brand-mark" width={448} height={209} /></a>
      <span className="edition">An independent<br />fashion journal<br />Vol. 01 — Autumn 2026</span>
    </header>

    <section className="dossier-head" aria-labelledby="dossier-title">
      <p className="dossier-kicker">Melody Lust · Editorial identity</p>
      <h1 id="dossier-title"><span className="dossier-title-main">Curator dossier</span> <span className="dossier-title-slash" aria-hidden>//</span> <span className="dossier-title-name">{name}</span></h1>
      <div className="dossier-meta">
        <span>{session ? memberSince(session.user.created_at) ?? "Member" : "Reading as a guest"}</span>
        <span className="dossier-role" data-role={role}>{role}</span>
        {session
          ? <NameEditor current={workspace?.displayName ?? ""} onSave={rename} disabled={!workspace} />
          : <Button variant="dossier" onClick={() => setAuthOpen(true)}>Sign in</Button>}
      </div>
      <dl className="dossier-stats">
        <div><dt>Want List items</dt><dd>{stats.wantList}</dd></div>
        <div><dt>Notes published</dt><dd>{stats.published ?? "—"}</dd></div>
        <div><dt>Genres</dt><dd>{stats.genres}</dd></div>
      </dl>
    </section>

    <Tabs tab={tab} onTabChange={onTabChange} />

    <section className="dossier-panel" role="tabpanel" id={`dossier-panel-${tab}`} aria-labelledby={`dossier-tab-${tab}`}>
      {tab === "edits" && <EditsPanel wishes={wishes} />}
      {tab === "library" && <MusicLibraryPanel />}
      {tab === "playlist" && <AiPlaylistPanel genres={styleDna(profile).genres} />}
      {tab === "dna" && <DnaPanel dna={styleDna(profile)} onRecalibrate={() => setQuizOpen(true)} />}
      {tab === "notes" && <NotesPanel signedIn={!!session} state={notesState} notes={workspace?.own ?? []} onSignIn={() => setAuthOpen(true)} onRetry={loadWorkspace} />}
      {tab === "account" && <AccountPanel session={session} displayName={workspace?.displayName ?? ""} canRename={!!workspace} onRename={rename}
        wishCount={wishes.length} onClearWishes={clearWishlist} onClearDna={clear} onSignIn={() => setAuthOpen(true)} onSignOut={() => void supabase.auth.signOut()} />}
    </section>

    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} onSignedIn={async () => { await loadWorkspace(); }} />
    <StyleProfileQuiz open={quizOpen} onOpenChange={setQuizOpen} profile={profile} onSave={save} onClear={clear} onRead={() => { window.location.href = "/#journal"; }} />
  </main>;
}

function Tabs({ tab, onTabChange }: { tab: DossierTab; onTabChange: (tab: DossierTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? DOSSIER_TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + DOSSIER_TABS.length) % DOSSIER_TABS.length;
    onTabChange(DOSSIER_TABS[n]!.id);
    refs.current[n]?.focus();
  };
  return <div className="dossier-tabs" role="tablist" aria-label="Dossier">
    {DOSSIER_TABS.map((t, i) => <Button key={t.id} variant="dossierTab" role="tab" id={`dossier-tab-${t.id}`} aria-controls={`dossier-panel-${t.id}`}
      aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} ref={el => { refs.current[i] = el; }}
      onClick={() => onTabChange(t.id)} onKeyDown={e => move(e, i)}>{`0${i + 1}. ${t.label}`}</Button>)}
  </div>;
}

function NameEditor({ current, onSave, disabled }: { current: string; onSave: (name: string) => Promise<void>; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!editing) setValue(current); }, [current, editing]);
  if (!editing) return <Button variant="dossier" disabled={disabled} onClick={() => setEditing(true)}><Pencil aria-hidden /> Edit name</Button>;
  const submit = async () => {
    setBusy(true); setError("");
    try { await onSave(value); setEditing(false); }
    catch (err) { setError(err instanceof Error && /under 60|Add a name/.test(err.message) ? err.message : "Your name could not be saved."); }
    finally { setBusy(false); }
  };
  return <form className="dossier-name" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <label><span className="sr-only">Display name</span><input value={value} onChange={e => setValue(e.target.value)} maxLength={60} autoFocus autoComplete="nickname" /></label>
    <Button type="submit" variant="dossier" disabled={busy || !value.trim()} aria-label="Save name"><Check aria-hidden /></Button>
    <Button type="button" variant="dossier" onClick={() => setEditing(false)} aria-label="Cancel"><X aria-hidden /></Button>
    {error && <span role="alert" className="dossier-error">{error}</span>}
  </form>;
}

function EditsPanel({ wishes }: { wishes: WishItem[] }) {
  const [shared, setShared] = useState<Omit<WishItem, "id">[] | null>(null);
  const [status, setStatus] = useState("");
  const [link, setLink] = useState("");
  useEffect(() => { setShared(editFromHash(window.location.hash)); }, []);
  const { pieces, songs } = wantListPairs(wishes);
  const dropHash = () => { setShared(null); history.replaceState(null, "", window.location.pathname + window.location.search); };
  const copyLink = async () => {
    const url = shareLink(window.location.origin, wishes);
    try { await navigator.clipboard.writeText(url); setLink(""); setStatus("Share link copied."); }
    catch { setLink(url); setStatus("Copy the link below to share your edit."); }
  };

  return <div className="dossier-edits">
    {shared && <aside className="dossier-shared" aria-label="A shared edit">
      <p className="dossier-kicker">A shared edit · {shared.length} {shared.length === 1 ? "save" : "saves"}</p>
      <ul>{shared.map((s, i) => <li key={i}>{s.kind === "song" ? <Music2 aria-hidden /> : null}{s.name}</li>)}</ul>
      <div className="dossier-actions">
        <Button variant="dossierSolid" onClick={() => { shared.forEach(s => addWish(s)); dropHash(); setStatus("Added to your Want List."); }}>Add to my Want List</Button>
        <Button variant="dossier" onClick={dropHash}>Dismiss</Button>
      </div>
    </aside>}

    <div className="dossier-toolbar">
      <p>Pieces and songs you've saved on this device, each piece with the track it's paired to.</p>
      <div className="dossier-actions">
        <Button variant="dossier" disabled={!wishes.length} onClick={() => exportWishlist(wishes, "txt")}><Download aria-hidden /> Export TXT</Button>
        <Button variant="dossier" disabled={!wishes.length} onClick={() => exportWishlist(wishes, "csv")}><Download aria-hidden /> Export CSV</Button>
        <Button variant="dossierSolid" disabled={!wishes.length} onClick={() => void copyLink()}><Link2 aria-hidden /> Copy share link</Button>
      </div>
    </div>
    <p role="status" className="dossier-status">{status}</p>
    {link && <input className="dossier-link" readOnly value={link} onFocus={e => e.target.select()} aria-label="Share link" />}

    {!wishes.length ? <div className="dossier-empty">
      <h2>Nothing saved yet.</h2>
      <p>Save pieces from the Shop and songs from the playlist; they'll gather here as your edit.</p>
      <Button asChild variant="dossierSolid"><a href="/#shop">Go to the Shop</a></Button>
    </div> : <>
      {pieces.length > 0 && <>
        <h2 className="dossier-section">Pieces</h2>
        <ul className="dossier-pieces">{pieces.map(({ item, song }) => <li key={item.id} className="dossier-piece">
          {item.image ? <img src={item.image} alt={item.name} loading="lazy" /> : <span className="dossier-piece-blank" aria-hidden>Piece</span>}
          <div>
            <h3>{item.name}</h3>
            {item.detail && <p className="dossier-piece-detail">{item.detail}</p>}
            {song && <p className="dossier-pair"><Music2 aria-hidden /> Paired with {song}</p>}
            <div className="dossier-row-actions">
              {item.link && <a href={item.link} target="_blank" rel="noreferrer">Open piece ↗</a>}
              <Button variant="editorial" onClick={() => removeWish(item.id)} aria-label={`Remove ${item.name}`}><Trash2 aria-hidden /> Remove</Button>
            </div>
          </div>
        </li>)}</ul>
      </>}
      {songs.length > 0 && <>
        <h2 className="dossier-section">Playlist</h2>
        <ul className="dossier-songs">{songs.map(s => <li key={s.id}>
          <Music2 aria-hidden /><span>{s.name}</span>
          {s.link && <a href={s.link} target="_blank" rel="noreferrer">Listen ↗</a>}
          <Button variant="editorial" onClick={() => removeWish(s.id)} aria-label={`Remove ${s.name}`}><Trash2 aria-hidden /></Button>
        </li>)}</ul>
      </>}
    </>}
  </div>;
}

function DnaPanel({ dna, onRecalibrate }: { dna: ReturnType<typeof styleDna>; onRecalibrate: () => void }) {
  if (dna.empty) return <div className="dossier-empty">
    <h2>No Style DNA yet.</h2>
    <p>Take the style quiz and Stylist AI will read your genres, palette and fits into every search.</p>
    <Button variant="dossierSolid" onClick={onRecalibrate}>Take the style quiz</Button>
  </div>;
  const row = (label: string, values: string[]) => values.length > 0 && <div className="dossier-dna-row">
    <h3>{label}</h3><ul>{values.map(v => <li key={v} className="dossier-chip">{v}</li>)}</ul>
  </div>;
  return <div className="dossier-dna">
    {row("Preferred genres", dna.genres)}
    {dna.palette.length > 0 && <div className="dossier-dna-row"><h3>Palette</h3><ul>{dna.palette.map(c => <li key={c.name} className="dossier-swatch"><span style={{ background: c.hex }} aria-hidden />{c.name}</li>)}</ul></div>}
    {row("Preferred fits", dna.fits)}
    {dna.more.map(m => row(m.label, m.values))}
    <Button variant="dossierSolid" onClick={onRecalibrate}>Recalibrate Style DNA</Button>
  </div>;
}

function NotesPanel({ signedIn, state, notes, onSignIn, onRetry }: {
  signedIn: boolean; state: "idle" | "loading" | "error"; notes: Workspace["own"]; onSignIn: () => void; onRetry: () => void;
}) {
  if (!signedIn) return <div className="dossier-empty">
    <h2>Your notes live with your account.</h2>
    <p>Sign in to see the Styling Notes you've sent in, and where each one is in review.</p>
    <Button variant="dossierSolid" onClick={onSignIn}>Sign in</Button>
  </div>;
  if (state === "loading") return <p className="dossier-status">Loading your Styling Notes…</p>;
  if (state === "error") return <div className="dossier-empty">
    <h2>Your notes can't be loaded right now.</h2>
    <p>Styling Notes may still be getting set up. Try again in a moment.</p>
    <Button variant="dossier" onClick={onRetry}>Try again</Button>
  </div>;
  return <div className="dossier-notes">
    <div className="dossier-toolbar">
      <p>Every note waits for a moderator before it's published.</p>
      <Button asChild variant="dossierSolid"><a href="/#styling-notes">Submit a new styling note</a></Button>
    </div>
    {!notes.length ? <p className="dossier-status">No notes yet. Your first one opens the page.</p> :
      <ul className="dossier-note-grid">{notes.map(n => {
        const status = NOTE_STATUS[n.status as NoteStatus] ?? NOTE_STATUS.pending;
        return <li key={n.id} className="dossier-note">
          {n.photo_urls[0] ? <img src={n.photo_urls[0]} alt={n.photo_alts[0] ?? n.title} loading="lazy" /> : <span className="dossier-piece-blank" aria-hidden>Look</span>}
          <span className="dossier-note-status" data-tone={status.tone}>{status.label}</span>
          <h3>{n.title}</h3>
          <p className="dossier-pair"><Music2 aria-hidden /> {n.song_track} — {n.song_artist}</p>
          <p className="dossier-note-idea">{n.styling_idea}</p>
          {n.status === "rejected" && n.rejection_reason && <p className="dossier-note-reason">Moderator's note: {n.rejection_reason}</p>}
        </li>;
      })}</ul>}
  </div>;
}

function AccountPanel({ session, displayName, canRename, onRename, wishCount, onClearWishes, onClearDna, onSignIn, onSignOut }: {
  session: Session | null; displayName: string; canRename: boolean; onRename: (name: string) => Promise<void>;
  wishCount: number; onClearWishes: () => void; onClearDna: () => boolean; onSignIn: () => void; onSignOut: () => void;
}) {
  const [name, setName] = useState(displayName);
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState<"wishes" | "dna" | null>(null);
  useEffect(() => setName(displayName), [displayName]);
  const saveName = async () => {
    try { await onRename(name); setStatus("Name saved."); }
    catch (err) { setStatus(err instanceof Error && /under 60|Add a name/.test(err.message) ? err.message : "Your name could not be saved."); }
  };
  const reset = (which: "wishes" | "dna") => {
    if (confirm !== which) { setConfirm(which); return; }
    if (which === "wishes") onClearWishes(); else onClearDna();
    setConfirm(null);
    setStatus(which === "wishes" ? "Want List cleared on this device." : "Style DNA cleared on this device.");
  };

  return <div className="dossier-account">
    <div className="dossier-account-block">
      <h2 className="dossier-section">Account</h2>
      {session ? <>
        <label className="dossier-field"><span>Email</span><input value={session.user.email ?? ""} readOnly /></label>
        <form className="dossier-field" onSubmit={e => { e.preventDefault(); void saveName(); }}>
          <label htmlFor="dossier-display-name"><span>Display name</span></label>
          <div className="dossier-inline">
            <input id="dossier-display-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} disabled={!canRename} autoComplete="nickname" />
            <Button type="submit" variant="dossierSolid" disabled={!canRename || !name.trim() || name.trim() === displayName}>Save</Button>
          </div>
        </form>
        <Button variant="dossier" onClick={onSignOut}><LogOut aria-hidden /> Sign out</Button>
      </> : <>
        <p>You're reading as a guest. Sign in to name your dossier and track your Styling Notes.</p>
        <Button variant="dossierSolid" onClick={onSignIn}>Sign in</Button>
      </>}
    </div>
    <div className="dossier-account-block">
      <h2 className="dossier-section">On this device</h2>
      <p>Your Want List, music library and Style DNA are kept in this browser, not your account.</p>
      <div className="dossier-actions">
        <Button variant="dossier" disabled={!wishCount} onClick={() => reset("wishes")}>{confirm === "wishes" ? `Tap again to clear ${wishCount} ${wishCount === 1 ? "save" : "saves"}` : "Clear Want List"}</Button>
        <Button variant="dossier" onClick={() => reset("dna")}>{confirm === "dna" ? "Tap again to clear Style DNA" : "Clear Style DNA"}</Button>
      </div>
      <p className="dossier-fine">Searches are cached by the journal's server, not on this device, so there's nothing else to clear here.</p>
    </div>
    <p role="status" className="dossier-status">{status}</p>
  </div>;
}
