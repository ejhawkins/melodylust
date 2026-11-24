import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type IssueTab = "playlists" | "runway" | "notes" | "fashion" | "reading" | "featured" | "beat" | "boards" | "want";
const TABS: { id: IssueTab; label: string }[] = [
  { id: "playlists", label: "Playlists" },
  { id: "runway", label: "Runway" },
  { id: "notes", label: "Notes" },
  { id: "fashion", label: "Fashion" },
  { id: "reading", label: "Reading" },
  { id: "featured", label: "Music Notes" },
  { id: "beat", label: "Celebrity" },
  { id: "boards", label: "Boards" },
];
const PER_PAGE = 4;

// Match the existing Reading Room breakpoint without offering a hidden tile on phones.
const readingHidden = "(max-width: 600px)";
const phoneTabs = TABS.filter(t => t.id !== "reading");
function subscribeToReadingVisibility(notify: () => void) {
  const query = window.matchMedia(readingHidden);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
const getReadingHidden = () => window.matchMedia(readingHidden).matches;
const getServerReadingHidden = () => false;
const smooth = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Four section tiles at a time on a native, snapping swipe track; pressing a tile opens its section. */
export function ListenIssueDock({ variant, docked = false, current, onPick }: { variant: "hero" | "dock"; docked?: boolean; current?: IssueTab | undefined; onPick: (tab: IssueTab) => void }) {
  const hideReading = useSyncExternalStore(subscribeToReadingVisibility, getReadingHidden, getServerReadingHidden);
  const tabs = hideReading ? phoneTabs : TABS;
  const pages = Math.ceil(tabs.length / PER_PAGE);
  const fillers = pages * PER_PAGE - tabs.length;
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const inactive = variant === "dock" && !docked;

  const pageWidth = (el: HTMLDivElement) => el.clientWidth + parseFloat(getComputedStyle(el).columnGap || "0");
  const goTo = (next: number, behavior: ScrollBehavior = smooth() ? "smooth" : "auto") => {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(pages - 1, next));
    el.scrollTo({ left: target * pageWidth(el), behavior });
  };

  // Open on the page that holds the current section.
  useEffect(() => {
    const at = tabs.findIndex(t => t.id === current);
    if (at >= 0) goTo(Math.floor(at / PER_PAGE), "auto");
  }, [current, tabs.length]);

  return (
    <nav className={`ls-issue-tabs ls-issue-${variant}`} data-docked={docked} aria-label={variant === "hero" ? "Sections" : "Sections, pinned"} aria-hidden={inactive} inert={inactive}>
      <div ref={track} className="ls-issue-track"
        onScroll={event => {
          const el = event.currentTarget;
          const next = Math.round(el.scrollLeft / pageWidth(el));
          if (next !== page) setPage(next);
        }}
        onKeyDown={event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(".ls-issue-tab")];
          const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (at < 0) return;
          event.preventDefault();
          const next = buttons[(at + (event.key === "ArrowLeft" ? -1 : 1) + buttons.length) % buttons.length];
          if (!next) return;
          next.focus({ preventScroll: true });
          goTo(Math.floor(buttons.indexOf(next) / PER_PAGE));
        }}
      >
        {tabs.map((tab, i) => (
          <Button key={tab.id} type="button" variant="ghost" className="ls-issue-tab" data-tab={tab.id} aria-pressed={current === tab.id}
            onFocus={() => goTo(Math.floor(i / PER_PAGE))} onClick={() => onPick(tab.id)}>
            <span className="ls-issue-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            <span className="ls-issue-label">{tab.label}</span>
          </Button>
        ))}
        {Array.from({ length: fillers }, (_, i) => <span key={i} className="ls-issue-filler" aria-hidden />)}
      </div>
      <div className="ls-issue-foot">
        <Button type="button" variant="ghost" size="icon" className="ls-issue-step" aria-label="Previous sections" disabled={page === 0} onClick={() => goTo(page - 1)}><ChevronLeft aria-hidden /></Button>
        <div className="ls-issue-pager" aria-hidden>
          {Array.from({ length: pages }, (_, i) => <span key={i} data-on={i === page} />)}
        </div>
        <p className="ls-issue-position" aria-live="polite">
          <span className="sr-only">Sections {page * PER_PAGE + 1} to {Math.min(tabs.length, (page + 1) * PER_PAGE)} of {tabs.length}</span>
          <span aria-hidden>{String(page + 1).padStart(2, "0")} / {String(pages).padStart(2, "0")}</span>
        </p>
        <Button type="button" variant="ghost" size="icon" className="ls-issue-step" aria-label="Next sections" disabled={page >= pages - 1} onClick={() => goTo(page + 1)}><ChevronRight aria-hidden /></Button>
      </div>
    </nav>
  );
}
