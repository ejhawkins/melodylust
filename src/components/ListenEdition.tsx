import { useState, type ReactNode } from "react";
import { ChevronDown, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { choiceLabel, EDITION_GENRES, type GenreChoice } from "@/lib/genre-edition";
import type { MixSong } from "@/lib/listening-room";
import type { Story } from "@/data/home";
import type { GoodRead } from "@/lib/good-reads";

const CHOICES: readonly GenreChoice[] = ["all", ...EDITION_GENRES];

/** The room's personal edition. A quiet badge says which genre the room is curated for and opens the choices; with a
 *  genre chosen it leads with that genre's newest story, then the rest, its Good Reads from Contentful, the runway
 *  pairings and the mix's songs for it.
 *  The stories arrive already netted out (Contentful's when connected, the bundled ones otherwise). */
export function ListenEdition({ choice, onChoose, stories, reads = [], songs, playing, onPlay, onRead, pairings }: {
  choice: GenreChoice;
  onChoose: (choice: GenreChoice) => void;
  stories: readonly Story[];
  /** The Good Reads filed under the chosen genre in Contentful: links out, each with its thumbnail. */
  reads?: readonly GoodRead[];
  songs: readonly { song: MixSong; index: number }[];
  /** The mix song the player holds while it plays, or null. */
  playing: number | null;
  onPlay: (index: number) => void;
  onRead: (story: Story) => void;
  /** The genre's Runway Note cards, or null when it has none (or they are already on the page below). */
  pairings: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [lead, ...rest] = stories;
  const personal = choice !== "all";

  return (
    <section className="ls-section ls-edition" aria-label={personal ? `Your ${choice} edition` : "Your edition"} data-personal={personal}>
      <Button variant="listenCategory" size="chip" className="ls-edition-badge" aria-expanded={open} aria-controls="ls-edition-genres" onClick={() => setOpen(v => !v)}>
        <span className="ls-edition-for">Curated for:</span>{" "}
        <span className="ls-edition-choice">{choiceLabel(choice)}</span>{" "}
        <span className="ls-edition-hint">Tap to change</span>
        <ChevronDown aria-hidden />
      </Button>
      {open && (
        <div id="ls-edition-genres" className="ls-edition-genres pill-rail" role="group" aria-label="Curate the room for a genre">
          {CHOICES.map(c => <Button key={c} variant="listenCategory" size="chip" aria-pressed={choice === c} onClick={() => { onChoose(c); setOpen(false); }}>{choiceLabel(c)}</Button>)}
        </div>
      )}

      {personal && <>
        <div className="ls-section-head">
          <h2>The {choice} <span className="ls-two-face-xxx">Edition</span></h2>
          <span>{stories.length} {stories.length === 1 ? "story" : "stories"}{reads.length > 0 && ` · ${reads.length} ${reads.length === 1 ? "good read" : "good reads"}`}{songs.length > 0 && ` · ${songs.length} ${songs.length === 1 ? "song" : "songs"}`}</span>
        </div>

        {lead ? (
          <Button variant="listenTile" size="block" className="ls-edition-lead w-full" aria-label={`Read ${lead.title}`} onClick={() => onRead(lead)}>
            {lead.image && <img src={lead.image} alt="" width={1600} height={1000} />}
            <span className="ls-edition-lead-text">
              <span className="ls-note-kicker">{lead.category} · {lead.date}</span>
              <span className="ls-edition-lead-title">{lead.title}</span>
              <span className="ls-note-intro">{lead.intro}</span>
            </span>
          </Button>
        ) : <p className="ls-empty">No {choice} stories filed yet.</p>}

        {rest.length > 0 && (
          <ul className="ls-edition-more">
            {rest.map(s => <li key={s.id}>
              <Button variant="listenTile" size="block" className="ls-note w-full" onClick={() => onRead(s)}>
                {s.image && <img src={s.image} alt="" width={400} height={500} loading="lazy" />}
                <span className="ls-note-kicker">{s.category} · {s.date}</span>
                <span className="ls-note-title">{s.title}</span>
                <span className="ls-note-intro">{s.intro}</span>
              </Button>
            </li>)}
          </ul>
        )}

        {reads.length > 0 && <>
          <h3 className="ls-edition-sub">Good reads</h3>
          <ol className="good-reads-list ls-edition-reads">
            {reads.map(read => <li key={read.id}>
              <a href={read.url} target="_blank" rel="noopener noreferrer">
                {read.image
                  ? <img className="good-reads-thumb" src={read.image} alt="" width={160} height={200} loading="lazy" />
                  : <span className="good-reads-thumb" aria-hidden>{read.source.charAt(0)}</span>}
                <span className="good-reads-text">
                  <span className="good-reads-source">{read.source}</span>{" "}
                  <span className="good-reads-title">{read.title}</span>{" "}
                  {read.note && <span className="good-reads-desc">{read.note}</span>}
                </span>
                <span className="good-reads-arrow" aria-hidden>↗</span>
              </a>
            </li>)}
          </ol>
        </>}

        {pairings && <>
          <h3 className="ls-edition-sub">Runway pairings</h3>
          {pairings}
        </>}

        {songs.length > 0 && <>
          <h3 className="ls-edition-sub">On the record</h3>
          <ul className="ls-tiles">
            {songs.map(({ song, index }) => <li key={song.caption}>
              <Button variant="listenTile" size="block" className="ls-tile w-full" data-active={playing === index} aria-label={`Play ${song.title} by ${song.artist}`} onClick={() => onPlay(index)}>
                <span className="ls-tile-art"><img src={song.art} alt="" width={300} height={300} loading="lazy" /><span className="ls-tile-play" aria-hidden><Play /></span></span>
                <span className="ls-tile-title">{song.title}</span>
                <span className="ls-tile-artist">{song.artist}</span>
              </Button>
            </li>)}
          </ul>
        </>}
      </>}
    </section>
  );
}
