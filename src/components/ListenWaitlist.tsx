import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * MOCKUP: the waitlist a reader is offered when the listening room is full (Spotify's development-mode cap). It shows
 * the flow only. Nothing is sent or stored, so no Melody Lust user records exist, and the reader is told so after
 * pressing Join. Wiring it to a real list (a form service or a table) is a separate, deliberate change.
 */
export function ListenWaitlist({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const field = useId();

  const join = (event: FormEvent) => {
    event.preventDefault();
    setJoined(true); // Mockup: the address goes nowhere.
  };
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) { setJoined(false); setEmail(""); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="ls-waitlist">
        <span className="ls-waitlist-kicker">Listening room · Waitlist <span className="ls-waitlist-badge">Preview</span></span>
        <DialogTitle className="ls-waitlist-title">The room is full tonight.</DialogTitle>
        {joined ? (
          <>
            <DialogDescription className="ls-waitlist-text" role="status">
              That's the waitlist as it will work. This is a preview, so nothing was sent and your email wasn't saved. Until
              spots open, previews still play in the bar.
            </DialogDescription>
            <Button variant="listenSolid" size="cta" className="ls-waitlist-cta" onClick={() => close(false)}>Back to the room</Button>
          </>
        ) : (
          <>
            <DialogDescription className="ls-waitlist-text">
              Full songs are open to a small guest list while Spotify reviews the room. Leave your email and we'll let you in
              when a spot opens.
            </DialogDescription>
            <form className="ls-waitlist-form" onSubmit={join}>
              <label htmlFor={field} className="ls-waitlist-label">Email</label>
              <input id={field} className="ls-waitlist-input" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Button type="submit" variant="listenSolid" size="cta" className="ls-waitlist-cta">Join the waitlist</Button>
            </form>
            <p className="ls-waitlist-fine">Spotify Premium needed to listen. Previews play for everyone.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
