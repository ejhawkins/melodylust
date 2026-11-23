import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/StylingNotes";
import { supabase } from "@/integrations/supabase/client";
import { saveRunwayOpinion } from "@/lib/styling-notes.functions";
import { defaultOpinionTitle, OPINION_LIMITS, opinionErrors, topicLabel, type RunwayTopicId } from "@/lib/runway-opinion";

/** A compact "Runway Style Opinion?" form for a runway film. The show comes from the page (`topic`) and is shown as
 *  context, never asked for. It submits through Styling Notes: signed in, saved pending, published only once a
 *  moderator approves it. */
export function RunwayOpinionComposer({ topic, onDone }: { topic: RunwayTopicId; onDone?: () => void }) {
  const save = useServerFn(saveRunwayOpinion);
  const [form, setForm] = useState({ title: defaultOpinionTitle(topic), opinion: "", notes: "" });
  const [errors, setErrors] = useState<ReturnType<typeof opinionErrors>>({});
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let live = true;
    void supabase.auth.getSession().then(({ data }) => { if (live) setSignedIn(Boolean(data.session)); });
    return () => { live = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    const input = { topic, ...form };
    const found = opinionErrors(input);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (!signedIn) { setAuthOpen(true); return; }
    setBusy(true);
    try {
      await save({ data: input });
      setSent(true);
      setStatus("Thanks! Your opinion is in review. It's published once a moderator approves it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Your Runway Style Opinion could not be submitted.");
    } finally { setBusy(false); }
  };

  const field = (name: "title" | "opinion" | "notes") => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `rso-${name}-error` : undefined,
  });

  return (
    <div className="rso">
      <p className="rso-context"><span>On the film</span><strong>{topicLabel(topic)}</strong></p>
      {sent ? (
        <div className="rso-sent">
          <p role="status">{status}</p>
          <Button variant="listenSolid" size="bar" onClick={onDone}><Check aria-hidden />Done</Button>
        </div>
      ) : (
        <form className="rso-form" onSubmit={submit} noValidate>
          <label>Title
            <input name="title" required minLength={OPINION_LIMITS.titleMin} maxLength={OPINION_LIMITS.titleMax} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} {...field("title")} />
          </label>
          {errors.title && <p className="rso-error" id="rso-title-error">{errors.title}</p>}
          <label>Opinion
            <textarea name="opinion" required rows={4} minLength={OPINION_LIMITS.opinionMin} maxLength={OPINION_LIMITS.opinionMax} placeholder="Your take on the film, the clothes or the sound." value={form.opinion} onChange={e => setForm({ ...form, opinion: e.target.value })} {...field("opinion")} />
          </label>
          {errors.opinion && <p className="rso-error" id="rso-opinion-error">{errors.opinion}</p>}
          <label>Notes <span className="rso-optional">(optional)</span>
            <textarea name="notes" rows={2} maxLength={OPINION_LIMITS.notesMax} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} {...field("notes")} />
          </label>
          {errors.notes && <p className="rso-error" id="rso-notes-error">{errors.notes}</p>}
          {status && <p className="rso-status" role="status">{status}</p>}
          <div className="rso-actions">
            <Button type="submit" variant="listenSolid" size="bar" disabled={busy || signedIn === null}>
              {busy ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : signedIn === false ? <LogIn aria-hidden /> : null}
              {signedIn === false ? "Sign in to submit" : "Submit for review"}
            </Button>
            <span className="rso-note">Reviewed before it's published.</span>
          </div>
        </form>
      )}
      <AuthDialog tone="room" open={authOpen} onOpenChange={setAuthOpen} onSignedIn={async () => setSignedIn(true)} />
    </div>
  );
}
