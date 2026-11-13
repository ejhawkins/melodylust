import { Button } from "@/components/ui/button";

export type IssueTab = "playlists" | "runway" | "notes" | "fashion" | "reading" | "beat" | "boards" | "want";
const TABS: { id: IssueTab; label: string }[] = [
  { id: "playlists", label: "Playlists" },
  { id: "runway", label: "Runway" },
  { id: "notes", label: "Notes" },
  { id: "fashion", label: "Fashion" },
  { id: "reading", label: "Reading" },
  { id: "beat", label: "Celebrity" },
  { id: "boards", label: "Boards" },
];

/** The Issue's sections as one slim row: inside the hero on phones, and pinned above the player once the hero scrolls away. */
export function ListenIssueDock({ variant, docked = false, current, onPick }: { variant: "hero" | "dock"; docked?: boolean; current?: IssueTab | undefined; onPick: (tab: IssueTab) => void }) {
  return (
    <nav className={`ls-issue-tabs ls-issue-${variant}`} data-docked={docked} aria-label={variant === "hero" ? "Sections" : "Sections, pinned"} aria-hidden={variant === "dock" && !docked} inert={variant === "dock" && !docked ? true : undefined}>
      {TABS.map(t => (
        <Button key={t.id} variant="ghost" size="sm" className="ls-issue-tab" aria-pressed={current === t.id} onClick={() => onPick(t.id)}>{t.label}</Button>
      ))}
    </nav>
  );
}
