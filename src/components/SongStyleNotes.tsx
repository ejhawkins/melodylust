import { useEffect, useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ml-song-style-notes";
type StyleReference = { image: string; quote: string };

export function SongStyleNotes({ song, references }: { song: string; references: StyleReference[] }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) setSaved(stored.filter((id): id is string => typeof id === "string"));
    } catch { setStatus("Saved notes could not be restored."); }
    setReady(true);
  }, []);

  const toggle = (id: string) => {
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      setStatus(next.includes(id) ? "Added to Style Notes · saved on this device." : "Removed from Style Notes.");
    } catch { setStatus("Your device could not save this note. Please allow browser storage and try again."); }
  };

  return <section className="song-style-notes" aria-labelledby="song-style-notes-title">
    <header><h3 id="song-style-notes-title">Style Notes</h3><span>Personal interpretations</span></header>
    <div className="song-note-filters" aria-label="Style Notes view">
      <Button variant="ghost" aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>All notes</Button>
      <Button variant="ghost" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><Bookmark />Saved notes</Button>
    </div>
    <div className="song-note-grid">{references.map((reference, index) => {
      const id = `${song}:${index}`;
      const isSaved = saved.includes(id);
      if (savedOnly && !isSaved) return null;
      return <article className="song-note-card" key={id}>
        <figure><img src={reference.image} alt={`Styling inspiration for ${song}, look ${index + 1}`} loading="lazy" /><span className="song-note-folio">Style study / 0{index + 1}</span></figure>
        <blockquote>“{reference.quote}”</blockquote>
        <Button variant="outline" className="song-note-save" disabled={!ready} aria-pressed={isSaved} onClick={() => toggle(id)}>{isSaved ? <Check /> : <Bookmark />}{isSaved ? "Added to Style Notes" : "Add to Style Notes"}</Button>
      </article>;
    })}</div>
    {savedOnly && !references.some((_, index) => saved.includes(`${song}:${index}`)) && <p className="song-note-empty">No saved notes for this track yet.</p>}
    {status && <p className="song-note-status" role="status">{status}</p>}
  </section>;
}