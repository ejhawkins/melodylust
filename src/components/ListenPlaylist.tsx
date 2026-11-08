import { useMemo, useState } from "react";
import { Play, Plus, Trash2, X } from "lucide-react";
import { GenreMark } from "@/components/GenreMark";
import { Button } from "@/components/ui/button";
import { blendName, mixGenres } from "@/lib/genre-shapes";
import type { MixSong } from "@/lib/listening-room";
import { deletePlaylist, toggleSong, type Playlist } from "@/lib/playlists";

/** One of the reader's playlists, opened from the library into the feed: its genre shape, its songs (each plays the
 *  playlist from there in the player bar) and The Autumn Mix's other songs to add. Deleting asks once more first. */
export function ListenPlaylist({ playlist, mix, playing, onPlay, onBack }: {
  playlist: Playlist;
  mix: readonly MixSong[];
  /** The song the player bar is on, when it is playing this playlist. */
  playing: number | null;
  onPlay: (index: number) => void;
  onBack: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const songs = useMemo(() => playlist.songs.flatMap(c => mix.filter(s => s.caption === c)), [playlist.songs, mix]);
  const rest = mix.filter(s => !playlist.songs.includes(s.caption));
  const blend = useMemo(() => mixGenres(songs), [songs]);
  const genres = blendName(blend);
  const count = songs.length === 1 ? "1 song" : `${songs.length} songs`;

  return (
    <section className="ls-board" aria-labelledby="ls-playlist-title">
      <div className="ls-board-head">
        <GenreMark genres={blend} className="ls-look-art" />
        <div>
          <p className="ls-kicker">Your playlist</p>
          <h1 id="ls-playlist-title" className="ls-board-title">{playlist.name}</h1>
          <p className="ls-board-meta">{genres ? `${count} · ${genres}` : `${count} · Its shape fills in as you add songs.`}</p>
          <div className="ls-look-actions">
            <Button variant="listenInk" size="bar" disabled={songs.length === 0} onClick={() => onPlay(0)}><Play className="fill-current" aria-hidden />Play the playlist</Button>
            {deleting ? <>
              <Button variant="listenInk" size="bar" onClick={() => { deletePlaylist(playlist.id); onBack(); }}><Trash2 aria-hidden />Delete it for good</Button>
              <Button variant="listenSave" size="bar" onClick={() => setDeleting(false)}>Keep it</Button>
            </> : <Button variant="listenSave" size="bar" onClick={() => setDeleting(true)}><Trash2 aria-hidden />Delete playlist</Button>}
          </div>
        </div>
      </div>

      <div className="ls-look-part">
        <div className="ls-section-head"><h2>+ The songs</h2></div>
        {songs.length === 0 ? <p className="ls-empty">No songs yet. Add some from The Autumn Mix below.</p> : (
          <ol className="ls-pieces">
            {songs.map((s, i) => (
              <li key={s.caption} data-playing={playing === i}>
                <img className="ls-pl-art" src={s.art} alt="" width={48} height={48} loading="lazy" />
                <span className="ls-piece-text"><span className="ls-piece-name">{s.title}</span><span className="ls-piece-note">{s.artist}</span></span>
                <Button variant="listenSave" size="icon" aria-label={`Play ${s.title} by ${s.artist}`} title="Play" onClick={() => onPlay(i)}><Play className="fill-current" aria-hidden /></Button>
                <Button variant="listenSave" size="icon" aria-label={`Take ${s.title} off ${playlist.name}`} title="Take it off" onClick={() => toggleSong(playlist.id, s.caption)}><X aria-hidden /></Button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {rest.length > 0 && (
        <div className="ls-look-part">
          <div className="ls-section-head"><h2>+ Add from The Autumn Mix</h2></div>
          <ul className="ls-pieces">
            {rest.map(s => (
              <li key={s.caption}>
                <img className="ls-pl-art" src={s.art} alt="" width={48} height={48} loading="lazy" />
                <span className="ls-piece-text"><span className="ls-piece-name">{s.title}</span><span className="ls-piece-note">{s.artist}</span></span>
                <Button variant="listenSave" size="chip" aria-label={`Add ${s.title} by ${s.artist} to ${playlist.name}`} onClick={() => toggleSong(playlist.id, s.caption)}><Plus aria-hidden />Add</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="listenCategory" size="chip" onClick={onBack}>Back to the feed</Button>
    </section>
  );
}
