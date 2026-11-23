import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { browserHandoff } from "@/lib/in-app-browser";
import { setSoundChoice, useInAppBrowser, useSoundChoice } from "@/lib/silent-mode";

const SETTLE_MS = 900;

/** Asked once, and only inside a social app's built-in browser: open the site in the phone's browser, or stay and
 *  choose silent mode or sound. Closing it without choosing means silent. It waits a moment after the page loads, so
 *  the reader sees where they landed first and the page finishes hydrating before the dialog hides it from screen readers. */
export function InAppAdvisory() {
  const app = useInAppBrowser();
  const choice = useSoundChoice();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const open = settled && app !== null && choice === null;
  const handoff = useMemo(() => (open ? browserHandoff(window.location.href, navigator.userAgent) : null), [open]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied", { description: "Paste it into your phone's browser." });
    } catch {
      toast("Copy didn't work", { description: "Use the app's menu to open this page in your browser." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) setSoundChoice("silent"); }}>
      <DialogContent className="inapp-advisory">
        <DialogTitle className="inapp-advisory-title">You're in {app}'s browser</DialogTitle>
        <DialogDescription className="inapp-advisory-text">
          Music plays best in your phone's browser. You can stay here in silent mode: nothing plays, and songs open in Spotify.
        </DialogDescription>
        <div className="inapp-advisory-actions">
          {handoff && <Button asChild variant="outline"><a href={handoff.href}>{handoff.label}</a></Button>}
          <Button variant="outline" onClick={copyLink}>Copy link</Button>
          <Button variant="default" onClick={() => setSoundChoice("silent")}>Continue silent</Button>
          <Button variant="ghost" onClick={() => setSoundChoice("sound")}>Continue with sound</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
