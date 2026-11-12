import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { NoteAvatar, noteDesigners } from "@/components/ListenRunway";
import { Button } from "@/components/ui/button";
import { spotifyEmbed } from "@/lib/listening-room";
import { SECTION_TAGS, SECTION_TITLES, type NoteSection, type NoteTrack, type RunwayNote } from "@/lib/runway-notes";
import type { RunwaySong } from "@/lib/runway-songs";

type Props = { note: RunwayNote; songs: readonly RunwaySong[]; playing: number | null; onPlay: (index: number) => void; onBack: () => void };

/** A Runway Note opened from its card into the feed: Report, then Music Notes, then Style Notes, each only when it has
 *  something to say. One song is set as Spotify's player; several are a numbered tracklist played through the room's bar. */
export function ListenRunwayNote({ note, songs, playing, onPlay, onBack }: Props) {
  const show = `${note.house} ${note.season} ${note.year}`;
  const by = noteDesigners(note);
  const sections: Record<NoteSection, () => ReactNode> = {
    report: () => <Report note={note} />,
    music: () => <Music note={note} songs={songs} playing={playing} onPlay={onPlay} />,
    style: () => <Style note={note} />,
  };
  return (
    <article className="ls-board ls-rn" aria-labelledby="ls-rn-title">
      <header className="ls-board-head">
        <NoteAvatar note={note} size={120} />
        <div>
          <p className="ls-kicker">Runway Note · {note.season} {note.year}</p>
          <h1 id="ls-rn-title" className="ls-board-title">{note.house}</h1>
          <p className="ls-board-meta">{[by, note.sections.map(section => SECTION_TAGS[section]).join(" · ")].filter(Boolean).join(" — ")}</p>
          <div className="ls-look-actions"><LikeButton kind="runway" id={note.id} name={`the ${show} Runway Note`} sub={`${note.season} ${note.year}`} /></div>
        </div>
      </header>

      {note.sections.map(section => (
        <section key={section} className="ls-rn-section" aria-labelledby={`ls-rn-${section}`}>
          <h2 id={`ls-rn-${section}`}>{SECTION_TITLES[section]}</h2>
          {sections[section]()}
        </section>
      ))}

      {note.sources.length > 0 && (
        <section className="ls-rn-section ls-rn-sources" aria-labelledby="ls-rn-sources">
          <h2 id="ls-rn-sources">Sources</h2>
          <ul>
            {note.sources.map(source => <li key={source.url}>
              <a className="film-link" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              {source.checked === "excerpt" && <span className="ls-rn-aside"> (search excerpt)</span>}
            </li>)}
          </ul>
        </section>
      )}

      <Button variant="listenCategory" size="chip" onClick={onBack}>Back to the feed</Button>
    </article>
  );
}

function Report({ note }: { note: RunwayNote }) {
  const report = note.report;
  if (!report) return null;
  const voice = report.voice;
  return <>
    <dl className="ls-rn-facts">
      {note.designers.length > 0 && <><dt>Designer</dt><dd>{note.designers.join(" & ")}</dd></>}
      <dt>Season</dt><dd>{note.season} {note.year}</dd>
      {report.place && <><dt>Venue</dt><dd>{report.place}</dd></>}
      {voice?.kind === "muse" && <><dt>Muse</dt><dd>{voice.text}</dd></>}
      {report.showstopper && <><dt>Showstopper</dt><dd>{report.showstopper}</dd></>}
    </dl>
    {voice?.kind === "quote" && (
      <figure className="ls-rn-quote">
        <blockquote cite={voice.source.url}><p>“{voice.text}”</p></blockquote>
        <figcaption>{voice.by}, to <a className="film-link" href={voice.source.url} target="_blank" rel="noreferrer">{voice.source.title.split(":")[0]}</a></figcaption>
      </figure>
    )}
    {report.summary.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {report.summaryByAi && <p className="ls-rn-aside">Summary from the show’s AI notes, drawn from the sources below.</p>}
  </>;
}

const trackName = (track: NoteTrack) => track.title ?? track.artist;

function Music({ note, songs, playing, onPlay }: { note: RunwayNote; songs: readonly RunwaySong[]; playing: number | null; onPlay: (index: number) => void }) {
  const music = note.music;
  if (!music) return null;
  const indexOf = (track: NoteTrack) => (track.songId ? songs.findIndex(song => song.id === track.songId) : -1);
  const [only] = music.tracks;
  const credit = music.credit && <p className="ls-rn-credit">Music by {music.credit}</p>;

  if (music.tracks.length === 1 && only) {
    const embed = only.spotifyId ? spotifyEmbed(`https://open.spotify.com/track/${only.spotifyId}`) : null;
    return <>
      {credit}
      <div className="ls-rn-track">
        <h3>{trackName(only)}</h3>
        {only.title && <p className="ls-rn-track-by">{only.artist}</p>}
        {only.why && <p>{only.why}</p>}
        {embed
          ? <iframe className="ls-rn-embed" src={embed} title={`${trackName(only)}${only.title ? ` by ${only.artist}` : ""} on Spotify`} loading="lazy" height={152} allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
          : <p className="ls-rn-aside">Not on Spotify.</p>}
      </div>
    </>;
  }

  return <>
    {credit}
    <ol className="ls-rn-tracks" role="list">
      {music.tracks.map((track, i) => {
        const index = indexOf(track);
        return <li key={`${i}-${track.artist}-${track.title}`} data-active={index >= 0 && index === playing}>
          <span className="ls-rn-track-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
          <div className="ls-rn-track">
            <h3>{trackName(track)}</h3>
            <p className="ls-rn-track-by">{[track.title ? track.artist : null, track.part, track.title ? null : "piece not named in reviews"].filter(Boolean).join(" · ")}</p>
            {track.why && <p>{track.why}</p>}
          </div>
          {index >= 0 && (
            <Button variant="listenIcon" size="round" className="ls-rn-track-play" aria-label={`Play ${trackName(track)}${track.title ? ` by ${track.artist}` : ""}`} data-active={index === playing} onClick={() => onPlay(index)}>
              <Play aria-hidden />
            </Button>
          )}
        </li>;
      })}
    </ol>
  </>;
}

function Style({ note }: { note: RunwayNote }) {
  if (!note.style) return null;
  return (
    <ul className="ls-rn-style">
      {note.style.map(item => <li key={item.text}>{item.text}{item.link && <> <a className="film-link" href={item.link.href} target="_blank" rel="noreferrer">{item.link.label}</a></>}</li>)}
    </ul>
  );
}
