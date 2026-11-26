import { Headphones, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modeLabel, noticeMessage } from "@/lib/listening-mode";
import type { RoomState } from "@/lib/spotify-room";

/** The player bar's mode line: which mode the room is in, the way in or out, and why it fell back to silence. */
export function ListenRoomSwitch({ room, onEnter, onLeave, onDismiss }: {
  room: RoomState;
  /** Null hides the way in (an in-app browser, where Spotify's player doesn't work). */
  onEnter: (() => void) | null;
  onLeave: () => void;
  onDismiss: () => void;
}) {
  const { mode, flash } = room;
  const notice = mode.kind === "silence" ? mode.notice : flash;
  const busy = mode.kind === "signing_in" || mode.kind === "connecting";
  return (
    <div className="ls-room" data-mode={mode.kind}>
      <span className="ls-room-mode" role="status" aria-live="polite">
        <span className="ls-room-dot" aria-hidden />
        <span className="sr-only">Listening room mode: </span>
        {modeLabel(mode)}
        {mode.kind === "listening" && !mode.ready && <span className="ls-room-sub"> · reconnecting</span>}
      </span>
      {mode.kind === "listening"
        ? <Button variant="listenOutline" size="chip" className="ls-room-btn" onClick={onLeave}><LogOut aria-hidden />Leave listening room</Button>
        : onEnter && <Button variant="listenOutline" size="chip" className="ls-room-btn" disabled={busy} aria-busy={busy} onClick={onEnter}><Headphones aria-hidden />{busy ? "Tuning in…" : "Enter the listening room"}</Button>}
      {notice && (
        <p className="ls-room-notice" role="alert">
          {noticeMessage[notice]}
          <Button variant="listenIcon" size="roundSm" className="ls-room-dismiss" aria-label="Dismiss" onClick={onDismiss}><X /></Button>
        </p>
      )}
    </div>
  );
}
