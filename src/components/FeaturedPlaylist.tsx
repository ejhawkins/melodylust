import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Check, Pause, Play, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesignerPortraits } from "@/lib/designer-radio.functions";
import type { MixSong } from "@/lib/listening-room";
import { inspire, playlistPage, profileTags, type PlaylistRow } from "@/lib/runway-inspiration";
import type { RunwayNote } from "@/lib/runway-notes";
import type { Designer, RunwaySong } from "@/lib/runway-songs";
import { createStudioPlaylist, importTracks } from "@/lib/studio";
import type { StyleProfile } from "@/lib/style-profile";

const spotify = (id: string) => `https://open.spotify.com/track/${id}`;

/** A playlist row for the player bar; only songs with a Spotify id can play there. */
function toMixSong(row: PlaylistRow, art = ""): MixSong | null {
  const { track } = row;
  return track.spotifyId ? { caption: `${track.title} — ${track.artist}`, title: track.title, artist: track.artist, art, alt: track.show, link: spotify(track.spotifyId) } : null;
}

/**
 * The featured playlist page: one playlist the agent suggested for the reader's tags, opened full size. Every song is
 * traced to the runway it walked, the designers who showed and the sources that place it there, with the house's own
 * store. The agent only suggests: the playlist joins the reader's library when they tap Save.
 */
export function FeaturedPlaylist({ id, profile, notes, songs, nowPlaying, onPlay, onBack }: {
  id: string; profile: StyleProfile; notes: readonly RunwayNote[]; songs: readonly RunwaySong[];
  nowPlaying?: string | undefined;
  onPlay: (queue: MixSong[], index: number) => void;
  onBack: () => void;
}) {
  const heading = useId();
  const page = useMemo(() => playlistPage(inspire(profileTags(profile), notes, songs), id), [profile, notes, songs, id]);
  const [saved, setSaved] = useState<string | null>(null);

  const unpictured = (page?.designers ?? []).filter(d => !d.photo).map(d => d.name);
  const { data: portraits } = useQuery({
    queryKey: ["runway-inspiration", "portraits", unpictured],
    queryFn: () => getDesignerPortraits({ data: { names: unpictured } }),
    enabled: unpictured.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const withPortrait = (d: Designer) => d.photo ? d : portraits?.find(p => p.name === d.name) ?? d;

  if (!page) {
    return (
      <article className="ls-board ls-fp" aria-labelledby={heading}>
        <h1 id={heading} className="ls-fp-title">This playlist left with your tags</h1>
        <p className="ls-fp-dek">Your tags changed, so the agent no longer suggests it. Runways for your taste has the playlists that fit now.</p>
        <Button variant="listenCategory" size="chip" onClick={onBack}><ArrowLeft aria-hidden />Runways for your taste</Button>
      </article>
    );
  }

  const { playlist, rows, shows } = page;
  const art = (row: PlaylistRow) => row.designers.map(withPortrait).find(d => d.photo)?.photo?.src ?? "";
  const playable = rows.flatMap(row => { const song = toMixSong(row, art(row)); return song ? [{ row, song }] : []; });
  const queue = playable.map(p => p.song);
  const playFrom = (row: PlaylistRow) => onPlay(queue, Math.max(0, playable.findIndex(p => p.row === row)));
  const save = () => {
    const list = createStudioPlaylist(playlist.title);
    const count = importTracks(list.id, playlist.tracks.map(t => ({ title: t.title, artist: t.artist, ...(t.spotifyId ? { spotify: t.spotifyId } : {}) })));
    setSaved(`Saved ${count} songs to your library`);
  };
  const cover = page.designers.slice(0, 4).map(withPortrait);

  return (
    <article className="ls-board ls-fp" aria-labelledby={heading}>
      <header className="ls-fp-head">
        <div className="ls-fp-cover" data-count={cover.length} aria-hidden>
          {cover.map(d => <span key={d.name} className="ls-fp-tile">{d.photo ? <img src={d.photo.src} alt="" referrerPolicy="no-referrer" /> : d.name.charAt(0)}</span>)}
        </div>
        <div className="ls-fp-intro">
          <p className="ls-kicker">Featured playlist · the agent suggests</p>
          <h1 id={heading} className="ls-fp-title">{playlist.title}</h1>
          <p className="ls-fp-meta">{rows.length} songs from {shows} {shows === 1 ? "show" : "shows"}{playlist.basis ? ` · for ${playlist.basis.value}` : " · for your tags"}</p>
          <p className="ls-fp-dek">Each song walked a runway, placed there by the sources cited under it. Genre tags are our read.</p>
          <div className="ls-look-actions">
            <Button variant="listenInk" size="bar" disabled={!queue.length} onClick={() => onPlay(queue, 0)}><Play className="fill-current" aria-hidden />Play the playlist</Button>
            {saved
              ? <p role="status" className="ri-saved"><Check aria-hidden /> {saved}</p>
              : <Button variant="listenCategory" size="chip" onClick={save}><Plus aria-hidden />Save to my library</Button>}
          </div>
        </div>
      </header>

      <ol className="ls-fp-tracks" aria-label={`Songs on ${playlist.title}`}>
        {rows.map((row, i) => {
          const { track } = row;
          const caption = `${track.title} — ${track.artist}`;
          const on = nowPlaying === caption;
          return (
            <li key={`${track.title}|${track.artist}`} className="ls-fp-track" data-playing={on || undefined}>
              <span className="ls-fp-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              {track.spotifyId
                ? <button type="button" className="ls-fp-play" aria-label={on ? `Now playing ${track.title}` : `Play ${track.title} by ${track.artist}`} onClick={() => playFrom(row)}>{on ? <Pause aria-hidden /> : <Play aria-hidden />}</button>
                : <span className="ls-fp-play" aria-hidden />}
              <div className="ls-fp-text">
                {track.spotifyId
                  ? <a className="ls-fp-song" href={spotify(track.spotifyId)} target="_blank" rel="noopener noreferrer">{track.title}<ArrowUpRight aria-hidden /></a>
                  : <p className="ls-fp-song">{track.title}</p>}
                <p className="ls-fp-artist">{track.artist}</p>
                <p className="ls-fp-show">{track.show}{row.designers.length > 0 && ` · ${row.designers.map(d => d.name).join(" & ")}`}</p>
                {row.part && <p className="ri-meta">{row.part}</p>}
                {row.shop && <a className="ri-set-shop" href={row.shop.url} target="_blank" rel="noopener noreferrer"><ShoppingBag aria-hidden />Shop {row.shop.house}<ArrowUpRight aria-hidden /></a>}
                {row.sources.length > 0 && <p className="ri-sources">Sources: {row.sources.map((s, n) => <span key={s.url}>{n > 0 && " · "}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>{s.checked === "excerpt" && <small> (excerpt)</small>}</span>)}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <Button variant="listenCategory" size="chip" onClick={onBack}><ArrowLeft aria-hidden />Runways for your taste</Button>
    </article>
  );
}
