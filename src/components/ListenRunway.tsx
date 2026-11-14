import { LikeButton } from "@/components/LikeButton";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesignerRadio } from "@/lib/designer-radio.functions";
import { getRunwayArchive } from "@/lib/runway-archive.functions";
import { withArchive } from "@/lib/runway-archive";
import { editorialSongs, runwayNotes, SECTION_TAGS, type RunwayNote } from "@/lib/runway-notes";
import { resolveSampler } from "@/lib/runway-sampler";
import { useSamplerEdits } from "@/lib/runway-sampler-store";
import { hiddenTracks, runwaySongs, type RunwaySong } from "@/lib/runway-songs";
import { getShowNotes } from "@/lib/show-notes.functions";

// The archive and designer radio Runway Songs adds to the sampler's songs; a failed fetch leaves the sampler's alone.
const extraSongs = queryOptions({
  queryKey: ["runway-songs", "extra"],
  queryFn: async () => {
    const [archive, radio] = await Promise.all([getRunwayArchive(), getDesignerRadio()]);
    return [...archive.songs, ...radio.songs];
  },
  staleTime: 10 * 60 * 1000,
});

// The AI show notes Runway Songs keeps per show; a Runway Note uses one for its Report when no editor has written one.
const showNotes = queryOptions({ queryKey: ["runway-songs", "show-notes"], queryFn: () => getShowNotes(), staleTime: 10 * 60 * 1000 });

/** Runway Songs' list, built the way its page builds it, then any Runway Note track it doesn't hold (Thom Browne's The Dope
 *  Show), so every note with a named Spotify track plays through the room. The server half loads only once `enabled`. */
export function useRunwaySongs(enabled: boolean): RunwaySong[] {
  const [edits] = useSamplerEdits();
  const { data: extra } = useQuery({ ...extraSongs, enabled });
  return useMemo(() => {
    const rows = resolveSampler(edits);
    const songs = withArchive(runwaySongs(rows), extra ?? [], hiddenTracks(rows));
    return [...songs, ...editorialSongs(songs)];
  }, [edits, extra]);
}

/** The room's runway songs as Runway Notes, one per show. */
export function useRunwayNotes(songs: readonly RunwaySong[], enabled: boolean): RunwayNote[] {
  const { data } = useQuery({ ...showNotes, enabled });
  return useMemo(() => runwayNotes(songs, data ?? {}), [songs, data]);
}

/** A note's designers by name, unless the house already says it (Thom Browne by Thom Browne). */
export const noteDesigners = (note: RunwayNote) => {
  const names = note.designers.filter(name => name.toLowerCase() !== note.house.toLowerCase());
  return names.length ? names.join(" & ") : null;
};

/** The note's sketched avatar, or the designer's initial in a disc until there is one. */
export function NoteAvatar({ note, size }: { note: RunwayNote; size: number }) {
  return note.avatar
    ? <img className="ls-rn-avatar" src={note.avatar.src} alt={note.avatar.alt} width={size} height={size} loading="lazy" />
    : <span className="ls-rn-avatar" style={{ width: size, height: size, fontSize: size / 2 }} aria-hidden>{note.initial}</span>;
}

/** The feed's "+ Runway Notes" section under the RUNWAY filter and the Runway Notes pill: one card per show, its lead song
 *  played through the room's own player bar, the whole note a press away. The full Runway Songs page is a link away. */
export function ListenRunway({ notes, songs, playing, onPlay, onOpen }: {
  notes: readonly RunwayNote[]; songs: readonly RunwaySong[]; playing: number | null; onPlay: (index: number) => void; onOpen: (id: string) => void;
}) {
  return (
    <section className="ls-section" aria-labelledby="ls-runway">
      <div className="ls-section-head">
        <h2 id="ls-runway">+ Runway Notes</h2>
        <Link to="/runway-songs" className="ls-section-link">Open Runway Songs<ArrowUpRight aria-hidden /></Link>
      </div>
      {notes.length === 0 ? <p className="ls-empty">Runway Notes has nothing to show yet.</p> : (
        <ul className="ls-rn-cards">
          {notes.map(note => {
            const index = note.lead?.songId ? songs.findIndex(song => song.id === note.lead?.songId) : -1;
            return <li key={note.id}><NoteCard note={note} index={index} active={index >= 0 && index === playing} onPlay={onPlay} onOpen={onOpen} /></li>;
          })}
        </ul>
      )}
    </section>
  );
}

/** One show's Runway Note as a card; also set under Runway Songs in the contents, for the latest note. */
export function NoteCard({ note, index, active, onPlay, onOpen }: { note: RunwayNote; index: number; active: boolean; onPlay: (index: number) => void; onOpen: (id: string) => void }) {
  const show = `${note.house} ${note.season} ${note.year}`;
  const by = noteDesigners(note);
  const lead = note.lead;
  return (
    <article className="ls-rn-card" aria-labelledby={`ls-rn-${note.id}`} data-active={active}>
      <header className="ls-rn-card-head">
        <NoteAvatar note={note} size={56} />
        <div>
          <h3 id={`ls-rn-${note.id}`} className="ls-rn-card-house">{note.house}</h3>
          {by && <p className="ls-rn-card-by">{by}</p>}
          <p className="ls-rn-season">{note.season} {note.year}</p>
        </div>
      </header>

      {lead && (index >= 0 ? (
        <Button variant="listenTile" size="block" className="ls-rn-card-song w-full" data-active={active}
          aria-label={`Play ${lead.title ?? lead.artist}${lead.title ? ` by ${lead.artist}` : ""}, from ${show}`} onClick={() => onPlay(index)}>
          <span className="ls-rn-card-track"><SongTitle text={lead.title ?? lead.artist} />{lead.title && <span className="ls-runway-artist">{lead.artist}</span>}</span>
          <span className="ls-runway-play" aria-hidden><Play /></span>
        </Button>
      ) : (
        <p className="ls-rn-card-song"><span className="ls-rn-card-track"><SongTitle text={lead.title ?? lead.artist} />{lead.title && <span className="ls-runway-artist">{lead.artist}</span>}</span></p>
      ))}

      {note.why && <p className="ls-rn-card-why">{note.why}</p>}

      <footer className="ls-rn-card-foot">
        <ul className="ls-rn-tags" aria-label="Sections in this note">{note.sections.map(section => <li key={section}>{SECTION_TAGS[section]}</li>)}</ul>
        <div className="ls-rn-card-actions">
          <LikeButton look="quick" kind="runway" id={note.id} name={`the ${show} Runway Note`} sub={lead ? `${lead.title ?? lead.artist} · ${note.season} ${note.year}` : `${note.season} ${note.year}`} />
          <Button variant="listenCategory" size="chip" aria-label={`Read the ${show} Runway Note`} onClick={() => onOpen(note.id)}>Read the note</Button>
        </div>
      </footer>
    </article>
  );
}

/** A song title set in the room's two display faces, like "The Autumn Mix": WTF Hammer, with the last word in XXX Compressed. */
function SongTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : undefined;
  return (
    <span className="ls-runway-name">
      {words.join(" ")}
      {last && <> <span className="ls-runway-name-xxx">{last}</span></>}
    </span>
  );
}
