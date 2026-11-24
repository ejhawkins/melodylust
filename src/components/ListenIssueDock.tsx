import { useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type IssueTab = "playlists" | "runway" | "notes" | "fashion" | "reading" | "featured" | "beat" | "boards" | "want";
const TABS: { id: IssueTab; label: string }[] = [
  { id: "playlists", label: "Playlists" },
  { id: "runway", label: "Runway" },
  { id: "notes", label: "Notes" },
  { id: "fashion", label: "Fashion" },
  { id: "reading", label: "Reading" },
  { id: "featured", label: "Featured" },
  { id: "beat", label: "Celebrity" },
  { id: "boards", label: "Boards" },
];

// Match the existing Reading Room breakpoint without offering a hidden slide on phones.
const readingHidden = "(max-width: 600px)";
const phoneTabs = TABS.filter(t => t.id !== "reading");
function subscribeToReadingVisibility(notify: () => void) {
  const query = window.matchMedia(readingHidden);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
const getReadingHidden = () => window.matchMedia(readingHidden).matches;
const getServerReadingHidden = () => false;

/** Browse one section at a time. Swiping changes the tile, while pressing it opens the section. */
export function ListenIssueDock({ variant, docked = false, current, onPick }: { variant: "hero" | "dock"; docked?: boolean; current?: IssueTab | undefined; onPick: (tab: IssueTab) => void }) {
  const hideReading = useSyncExternalStore(subscribeToReadingVisibility, getReadingHidden, getServerReadingHidden);
  const tabs = hideReading ? phoneTabs : TABS;
  const [browse, setBrowse] = useState<{ from: IssueTab | undefined; id: IssueTab }>();
  const displayId = browse && browse.from === current ? browse.id : current;
  const index = Math.max(0, tabs.findIndex(t => t.id === displayId));
  const tab = tabs[index];
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const inactive = variant === "dock" && !docked;
  const move = (direction: number) => setBrowse({ from: current, id: tabs[(index + direction + tabs.length) % tabs.length].id });

  return (
    <nav className={`ls-issue-tabs ls-issue-${variant}`} data-docked={docked} aria-label={variant === "hero" ? "Sections" : "Sections, pinned"} aria-hidden={inactive} inert={inactive}
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <Button type="button" variant="ghost" size="icon" className="ls-issue-step" aria-label="Previous section" onClick={() => move(-1)}><ChevronLeft aria-hidden /></Button>
      <Button type="button" variant="ghost" className="ls-issue-tab" data-tab={tab.id} aria-pressed={current === tab.id}
        onPointerDown={event => {
          suppressClick.current = false;
          if (!event.isPrimary || event.pointerType === "mouse") return;
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={event => {
          if (pointer.current?.id === event.pointerId) pointer.current = null;
        }}
        onPointerUp={event => {
          const start = pointer.current;
          if (!start || start.id !== event.pointerId) return;
          pointer.current = null;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 32 || Math.abs(dx) <= Math.abs(dy)) return;
          suppressClick.current = true;
          move(dx < 0 ? 1 : -1);
        }}
        onClick={event => {
          if (!suppressClick.current || event.detail === 0) onPick(tab.id);
          suppressClick.current = false;
        }}
      >{tab.label}</Button>
      <Button type="button" variant="ghost" size="icon" className="ls-issue-step" aria-label="Next section" onClick={() => move(1)}><ChevronRight aria-hidden /></Button>
      <p className="ls-issue-position" aria-live="polite" aria-atomic="true">
        <span className="sr-only">{tab.label}, section {index + 1} of {tabs.length}</span>
        <span aria-hidden>{String(index + 1).padStart(2, "0")} / {String(tabs.length).padStart(2, "0")}</span>
        <span className="ls-issue-swipe" aria-hidden>Swipe to browse</span>
      </p>
    </nav>
  );
}
