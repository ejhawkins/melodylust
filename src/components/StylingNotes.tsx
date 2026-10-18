import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, LoaderCircle, LogIn, Music2, PenLine, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { availableGoogleFlow, signInWithGoogle, type GoogleFlow } from "@/lib/google-sign-in";
import { authMessage } from "@/lib/auth-messages";
import {
  deleteStylingNote, getStylingNotesWorkspace, listApprovedStylingNotes,
  reviewStylingNote, saveStylingNote, type StylingNoteView,
} from "@/lib/styling-notes.functions";

type Workspace = Awaited<ReturnType<typeof getStylingNotesWorkspace>>;
type AuthMode = "signin" | "signup" | "forgot" | "reset";
const emptyForm = { displayName: "", title: "", stylingIdea: "", tags: "", songArtist: "", songTrack: "", songReason: "" };

export function StylingNotes() {
  const listPublic = useServerFn(listApprovedStylingNotes);
  const getWorkspace = useServerFn(getStylingNotesWorkspace);
  const saveNote = useServerFn(saveStylingNote);
  const removeNote = useServerFn(deleteStylingNote);
  const reviewNote = useServerFn(reviewStylingNote);
  const [notes, setNotes] = useState<StylingNoteView[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [compose, setCompose] = useState(false);
  const [editing, setEditing] = useState<StylingNoteView | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file) })), [files]);

  const refreshPublic = async () => setNotes((await listPublic()).notes);
  const refreshWorkspace = async () => {
    try { setWorkspace(await getWorkspace()); }
    catch { setWorkspace(null); }
  };
  // A password-reset link lands here with "type=recovery" in the address; Supabase clears it once read.
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    let live = true;
    if (/[#&]type=recovery\b/.test(window.location.hash)) { setRecovering(true); setAuthOpen(true); }
    void Promise.all([listPublic(), supabase.auth.getSession()]).then(async ([publicResult, authResult]) => {
      if (!live) return;
      setNotes(publicResult.notes);
      const signedIn = Boolean(authResult.data.session);
      setSession(signedIn);
      if (signedIn) await refreshWorkspace();
    }).catch(() => setMessage("Styling Notes are taking a moment to load.")).finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "PASSWORD_RECOVERY") return;
      if (event === "PASSWORD_RECOVERY") { setRecovering(true); setAuthOpen(true); return; }
      const signedIn = event !== "SIGNED_OUT";
      setSession(signedIn);
      if (signedIn) void refreshWorkspace(); else setWorkspace(null);
    });
    return () => { live = false; data.subscription.unsubscribe(); previews.forEach(preview => URL.revokeObjectURL(preview.url)); };
  }, []);

  const openComposer = (note?: StylingNoteView) => {
    if (!session) { setAuthOpen(true); return; }
    setEditing(note ?? null);
    setFiles([]);
    setForm(note ? {
      displayName: note.author_display_name, title: note.title, stylingIdea: note.styling_idea,
      tags: note.tags.join(", "), songArtist: note.song_artist, songTrack: note.song_track, songReason: note.song_reason,
    } : { ...emptyForm, displayName: workspace?.displayName ?? "" });
    setCompose(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage("");
    const uploaded: string[] = [];
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      let paths = editing?.photo_paths ?? [];
      let alts = editing?.photo_alts ?? [];
      if (files.length) {
        paths = [];
        alts = [];
        for (const [index, file] of files.entries()) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${userId}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("styling-notes").upload(path, file, { contentType: file.type, upsert: false });
          if (error) throw new Error("A photo could not be uploaded.");
          uploaded.push(path); paths.push(path); alts.push(`${form.title || "Styling look"}, photo ${index + 1}`);
        }
      }
      await saveNote({ data: {
        ...(editing ? { id: editing.id } : {}), displayName: form.displayName, title: form.title,
        stylingIdea: form.stylingIdea, tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        songArtist: form.songArtist, songTrack: form.songTrack, songReason: form.songReason,
        photoPaths: paths, photoAlts: alts,
      } });
      setCompose(false); setEditing(null); setFiles([]);
      setMessage("Your Styling Note is in review. You can follow its status in My submissions.");
      await refreshWorkspace(); await refreshPublic();
    } catch (error) {
      if (uploaded.length) await supabase.storage.from("styling-notes").remove(uploaded);
      setMessage(error instanceof Error ? error.message : "Your Styling Note could not be submitted.");
    } finally { setLoading(false); }
  };

  return <section className="styling-notes chapter-reveal" id="styling-notes" aria-labelledby="styling-notes-title">
    <div className="styling-wipe" aria-hidden="true"><span>PLAY IT. WEAR IT.</span></div>
    <header className="styling-notes-head">
      <p className="styling-kicker">Community issue / 001</p>
      <h2 id="styling-notes-title">STYLING<br />NOTES</h2>
      <div><p>One look. One track. Your point of view.</p><Button onClick={() => openComposer()}><PenLine />Share your note</Button></div>
    </header>
    {message && <p className="styling-status" role="status">{message}</p>}
    {loading && !notes.length ? <p className="styling-empty"><LoaderCircle className="motion-safe:animate-spin" />Loading the community edit…</p>
      : notes.length ? <div className="styling-notes-grid">{notes.map((note, index) => <NoteCard key={note.id} note={note} index={index} />)}</div>
      : <div className="styling-empty"><span>Issue 001</span><h3>The first page is yours.</h3><p>No Styling Notes have been approved yet.</p><Button variant="outline" onClick={() => openComposer()}><Plus />Submit the first look</Button></div>}

    {session && workspace && <section className="styling-workspace" aria-labelledby="my-styling-notes"><div className="styling-section-label"><h3 id="my-styling-notes">My submissions</h3><span>{workspace.own.length}</span></div>{workspace.own.length ? <div className="styling-submission-list">{workspace.own.map(note => <article key={note.id}><span className="styling-state" data-status={note.status}>{note.status}</span><div><h4>{note.title}</h4>{note.rejection_reason && <p>{note.rejection_reason}</p>}</div><Button size="icon" variant="ghost" aria-label={`Edit ${note.title}`} onClick={() => openComposer(note)}><PenLine /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${note.title}`} onClick={async () => { if (!window.confirm("Delete this Styling Note?")) return; await removeNote({ data: { id: note.id } }); await refreshWorkspace(); }}><Trash2 /></Button></article>)}</div> : <p className="styling-workspace-empty">Nothing submitted yet.</p>}</section>}

    {workspace?.canModerate && <section className="styling-workspace" aria-labelledby="review-queue"><div className="styling-section-label"><h3 id="review-queue">Review queue</h3><span>{workspace.queue.length}</span></div>{workspace.queue.map(note => <article className="styling-review-row" key={note.id}><NoteCard note={note} index={0} /><div><Button onClick={async () => { await reviewNote({ data: { id: note.id, decision: "approved" } }); await refreshWorkspace(); await refreshPublic(); }}><Check />Approve</Button><Button variant="outline" onClick={async () => { const reason = window.prompt("Reason for the author?"); if (!reason) return; await reviewNote({ data: { id: note.id, decision: "rejected", reason } }); await refreshWorkspace(); }}><X />Reject</Button></div></article>)}</section>}

    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode={recovering ? "reset" : "signin"} onPasswordUpdated={() => setRecovering(false)} onSignedIn={refreshWorkspace} />
    <Dialog open={compose} onOpenChange={setCompose}><DialogContent className="styling-compose"><DialogTitle>{editing ? "Edit your Styling Note" : "Share a Styling Note"}</DialogTitle><DialogDescription>Pair a real styling idea with the track you hear in it. Submissions are reviewed before publication.</DialogDescription><form onSubmit={submit}>
      <label>Public display name<input required minLength={1} maxLength={60} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></label>
      <label>Title<input required minLength={3} maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label className="styling-wide">Styling idea<textarea required minLength={10} maxLength={2000} rows={5} value={form.stylingIdea} onChange={e => setForm({ ...form, stylingIdea: e.target.value })} /></label>
      <label className="styling-wide">Tags<input maxLength={240} placeholder="tailoring, after dark, silver" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></label>
      <label>Song artist<input required maxLength={120} value={form.songArtist} onChange={e => setForm({ ...form, songArtist: e.target.value })} /></label>
      <label>Track<input required maxLength={160} value={form.songTrack} onChange={e => setForm({ ...form, songTrack: e.target.value })} /></label>
      <label className="styling-wide">Why this song?<textarea required minLength={3} maxLength={500} rows={3} value={form.songReason} onChange={e => setForm({ ...form, songReason: e.target.value })} /></label>
      <label className="styling-upload styling-wide"><Camera />{editing ? "Replace photos (optional)" : "Add 1–4 photos"}<input required={!editing} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const chosen = Array.from(e.target.files ?? []).slice(0, 4); if (chosen.some(file => file.size > 8 * 1024 * 1024)) { setMessage("Each photo must be 8 MB or smaller."); return; } setFiles(chosen); }} /></label>
      {previews.length > 0 && <div className="styling-previews styling-wide">{previews.map(preview => <img key={preview.url} src={preview.url} alt="Selected styling preview" />)}</div>}
      <Button className="styling-wide" type="submit" disabled={loading}>{loading ? <LoaderCircle className="motion-safe:animate-spin" /> : <ArrowIcon />}Submit for review</Button>
    </form></DialogContent></Dialog>
  </section>;
}

function ArrowIcon() { return <span aria-hidden="true">↗</span>; }

function NoteCard({ note, index }: { note: StylingNoteView; index: number }) {
  return <article className="styling-note" style={{ "--note-delay": `${Math.min(index, 8) * 70}ms` } as React.CSSProperties}>
    <div className="styling-note-images" data-count={note.photo_urls.length}>{note.photo_urls.map((url, imageIndex) => url && <img key={url} src={url} alt={note.photo_alts[imageIndex] ?? note.title} loading="lazy" />)}</div>
    <div className="styling-note-folio"><span>By {note.author_display_name}</span><span>{new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
    <h3>{note.title}</h3><p>{note.styling_idea}</p>
    {note.tags.length > 0 && <div className="styling-tags">{note.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
    <div className="styling-song"><Music2 aria-hidden="true" /><div><strong>{note.song_track}</strong><span>{note.song_artist}</span><p>{note.song_reason}</p></div></div>
  </article>;
}

export function AuthDialog({ open, onOpenChange, onSignedIn, initialMode = "signin", onPasswordUpdated }: { open: boolean; onOpenChange: (open: boolean) => void; onSignedIn: () => Promise<void>; initialMode?: AuthMode; onPasswordUpdated?: () => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [displayName, setDisplayName] = useState(""); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  // Each time it opens, start where the visit needs it: a reset link goes straight to a new password.
  useEffect(() => { if (open) { setMode(initialMode); setStatus(""); } }, [open, initialMode]);
  // Google only shows where it can work: Lovable's hosting, or once the Supabase provider is on.
  const [google, setGoogle] = useState<GoogleFlow>(null);
  useEffect(() => { if (open) void availableGoogleFlow().then(setGoogle); }, [open]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setStatus(""); try {
    if (mode === "forgot") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` }); if (error) throw error; setStatus("Check your email for the recovery link."); }
    else if (mode === "reset") { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setStatus("Your password is updated."); setMode("signin"); onPasswordUpdated?.(); }
    else if (mode === "signup") { const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}/` } }); if (error) throw error; if (!data.session) setStatus("Check your email to confirm your account."); else { await onSignedIn(); onOpenChange(false); } }
    else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; await onSignedIn(); onOpenChange(false); }
  } catch (error) { setStatus(authMessage(error)); } finally { setBusy(false); } };
  // A message belongs to the screen it came from; switching screens starts clean.
  const go = (next: AuthMode) => { setMode(next); setStatus(""); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="styling-auth"><DialogTitle>{mode === "signup" ? "Join Styling Notes" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Sign in to contribute"}</DialogTitle><DialogDescription>Browse freely. Sign in only when you want to submit or manage your notes.</DialogDescription><form onSubmit={submit}>
    {mode === "signup" && <label>Display name<input required maxLength={60} value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>}
    {mode !== "reset" && <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
    {mode !== "forgot" && <label>Password<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>}
    {status && <p role="status">{status}</p>}<Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <LogIn />}{mode === "signup" ? "Create account" : mode === "forgot" ? "Send recovery link" : mode === "reset" ? "Update password" : "Sign in"}</Button>
  </form>{mode !== "reset" && google && <><div className="styling-auth-or"><span>or</span></div><Button variant="outline" onClick={async () => { setBusy(true); const error = await signInWithGoogle(google); setBusy(false); if (error) setStatus(authMessage(error)); }}>Continue with Google</Button></>}
  <div className="styling-auth-links">{mode === "signin" ? <><button onClick={() => go("signup")}>Create account</button><button onClick={() => go("forgot")}>Forgot password?</button></> : mode !== "reset" && <button onClick={() => go("signin")}>Back to sign in</button>}</div></DialogContent></Dialog>;
}