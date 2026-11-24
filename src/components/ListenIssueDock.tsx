import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
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
type StepDirection = -1 | 1;

/** Browse one section at a time. Swiping changes the tile, while pressing it opens the section. */
export function ListenIssueDock({ variant, docked = false, current, onPick }: { variant: "hero" | "dock"; docked?: boolean; current?: IssueTab | undefined; onPick: (tab: IssueTab) => void }) {
  const hideReading = useSyncExternalStore(subscribeToReadingVisibility, getReadingHidden, getServerReadingHidden);
  const tabs = hideReading ? phoneTabs : TABS;
  const [browse, setBrowse] = useState<{ from: IssueTab | undefined; id: IssueTab; previous: string; direction: StepDirection; offset: number }>();
  const displayId = browse && browse.from === current ? browse.id : current;
  const index = Math.max(0, tabs.findIndex(t => t.id === displayId));
  const tab = tabs[index];
  const pointer = useRef<{ id: number; x: number; y: number; offset: number } | null>(null);
  const suppressClick = useRef(false);
  const inactive = variant === "dock" && !docked;
  const motion = browse?.from === current && browse?.id === tab.id ? browse : undefined;
  const move = (direction: StepDirection, offset = 0) => setBrowse({
    from: current,
    id: tabs[(index + direction + tabs.length) % tabs.length].id,
    previous: tab.label,
    direction,
    offset,
  });
  const release = (button: HTMLButtonElement, snapBack: boolean) => {
    pointer.current = null;
    if (snapBack && button.dataset["dragging"]) button.dataset["settling"] = "true";
    delete button.dataset["dragging"];
    button.style.removeProperty("--issue-drag");
  };

  return (
    <nav className={`ls-issue-tabs ls-issue-${variant}`} data-docked={docked} aria-label={variant === "hero" ? "Sections" : "Sections, pinned"} aria-hidden={inactive} inert={inactive}
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <Button type="button" variant="ghost" size="icon" className="ls-issue-step" aria-label="Previous section" onClick={() => move(-1)}><ChevronLeft aria-hidden /></Button>
      <Button type="button" variant="ghost" className="ls-issue-tab" data-tab={tab.id} aria-label={tab.label} aria-pressed={current === tab.id}
        onPointerDown={event => {
          suppressClick.current = false;
          if (!event.isPrimary || event.pointerType === "mouse") return;
          delete event.currentTarget.dataset["settling"];
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: 0 };
        }}
        onPointerMove={event => {
          const start = pointer.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          const button = event.currentTarget;
          if (!button.dataset["dragging"] && (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy))) return;
          const limit = button.clientWidth * .65;
          start.offset = Math.max(-limit, Math.min(dx, limit));
          button.dataset["dragging"] = "true";
          button.style.setProperty("--issue-drag", `${start.offset}px`);
        }}
        onPointerCancel={event => {
          if (pointer.current?.id === event.pointerId) release(event.currentTarget, true);
        }}
        onPointerUp={event => {
          const start = pointer.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          const advance = Math.abs(dx) >= 32 && Math.abs(dx) > Math.abs(dy);
          release(event.currentTarget, !advance);
          if (start.offset !== 0) suppressClick.current = true;
          if (!advance) return;
          suppressClick.current = true;
          move(dx < 0 ? 1 : -1, start.offset);
        }}
        onClick={event => {
          if (!suppressClick.current || event.detail === 0) onPick(tab.id);
          suppressClick.current = false;
        }}
      >
        <span className="ls-issue-labels" aria-hidden="true">
          <span key={tab.id} className="ls-issue-slide" data-previous-label={motion?.previous} data-direction={motion && (motion.direction > 0 ? "next" : "previous")}
            style={motion ? { "--issue-release": `${motion.offset}px` } as CSSProperties : undefined}>
            <span className="ls-issue-label">{tab.label}</span>
          </span>
        </span>
      </Button>
      <Button type="button" variant="ghost" size="icon" className="ls-issue-step" aria-label="Next section" onClick={() => move(1)}><ChevronRight aria-hidden /></Button>
      <p className="ls-issue-position" aria-live="polite" aria-atomic="true">
        <span className="sr-only">{tab.label}, section {index + 1} of {tabs.length}</span>
        <span aria-hidden>{String(index + 1).padStart(2, "0")} / {String(tabs.length).padStart(2, "0")}</span>
        <span className="ls-issue-swipe" aria-hidden>Swipe to browse</span>
      </p>
    </nav>
  );
}
