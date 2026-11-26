import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Disc3, Pause, Play, Shirt, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HammerTitle, SheetPostcard } from "@/components/SheetPostcard";
import { findWish, spotifyEmbed, type MixSong } from "@/lib/listening-room";
import { spotifyTrackId, useAlbumArt } from "@/lib/album-art";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";
import { trackUri } from "@/lib/spotify-api";
import type { RoomState } from "@/lib/spotify-room";

import { SpotifyFrame } from "@/components/SpotifyFrame";
/** The listening room's player bar. In silence (always, unless the listening-room flag is on and the reader signed in
 *  with Spotify) playback is Spotify's own embedded player, loaded only once the reader presses play; before that
 *  nothing from Spotify loads on the page. In listening mode the same controls drive this browser's Spotify player. */
export function ListenPlayer({ song, listening, onListen, onPrev, onNext, wearingOpen, onWearingChange, sheet = false, autoOpen = true, shop, room }: {
  song: MixSong;
  listening: boolean;
  onListen: () => void;
  onPrev: () => void;
  onNext: () => void;
  wearingOpen: boolean;
  onWearingChange: (open: boolean) => void;
  /** Phones: once a song plays, the bar slides up into a full-screen Now Playing sheet on the same page. */
  sheet?: boolean;
  /** Whether a new song opens that sheet by itself. The Featured tab turns it off, so its covers stay in view; the
   *  bar's own button still opens the sheet. */
  autoOpen?: boolean;
  shop?: ReactNode;
  /** The listening room (flag on only): its state, pause/resume, and the mode line to show under the controls. */
  room?: { state: RoomState; onToggle: () => void; switcher: ReactNode };
}) {
  const items = useWishlist();
  const saved = findWish(items, "song", song.caption);
  const embed = spotifyEmbed(song.link);
  // Songs that come without art (Runway Songs, imported Studio songs) show their record's cover from Spotify.
  const fetched = useAlbumArt(song.art ? null : spotifyTrackId(song.link));
  const art = song.art || fetched;
  // Listening mode: full songs through this browser's Spotify player instead of the embed.
  const full = room?.state.mode.kind === "listening";
  const here = full && listening && room.state.playing !== null && room.state.playing.trackUri === trackUri(song.link);
  const paused = !here || (room?.state.playing?.paused ?? true);
  const playing = full ? listening : listening && embed !== null;
  const [expanded, setExpanded] = useState(false);
  // Each new song opens the sheet again; the same element stays mounted, so Spotify keeps playing.
  // Read through a ref: leaving the Featured tab mid-song must not throw the sheet open.
  const auto = useRef(autoOpen);
  auto.current = autoOpen;
  useEffect(() => { setExpanded(sheet && playing && auto.current); }, [sheet, playing, song.caption]);
  const open = sheet && playing && expanded;

  return (
    <footer className="ls-player" aria-label="Player" data-listening={playing} data-expanded={open}>
      {open && (
        <div className="ls-sheet-head">
          <span className="ls-sheet-label">Now playing</span>
          <Button variant="listenIcon" size="round" aria-label="Minimize player" onClick={() => setExpanded(false)}><ChevronDown /></Button>
        </div>
      )}
      {/* Keyed by song, so each new song arrives as a postcard: written on the back, then flipped and zoomed to its cover. */}
      {open && <SheetPostcard key={song.caption} art={art ?? undefined} title={song.title} artist={song.artist} genres={song.genres} />}
      <div className="ls-player-song">
        {art ? <img src={art} alt="" width={56} height={56} /> : <span className="ls-player-blank" aria-hidden><Disc3 /></span>}
        <div className="ls-row-text">
          <p className="ls-player-title">{open ? <HammerTitle text={song.title} /> : song.title}</p>
          <p className="ls-player-artist">{open ? <span className="ls-mask"><span className="ls-mask-in">{song.artist}</span></span> : song.artist}</p>
        </div>
        <Button variant="listenIcon" size="round" aria-pressed={Boolean(saved)} aria-label={saved ? `Remove ${song.title} from your Want List` : `Save ${song.title} to your Want List`}
          onClick={() => (saved ? removeWish(saved.id) : addWish({ kind: "song", name: song.caption, detail: "", link: song.link, note: "" }))}>{saved ? <BookmarkCheck /> : <Bookmark />}</Button>
      </div>
      <div className="ls-player-center">
        <div className="ls-player-controls">
          <Button variant="listenIcon" size="round" aria-label="Previous song" onClick={onPrev}><SkipBack /></Button>
          {full
            ? <Button variant="listenPlay" size="round" aria-label={paused ? `Play ${song.title} by ${song.artist}` : `Pause ${song.title}`} onClick={here ? room.onToggle : onListen}>{paused ? <Play /> : <Pause />}</Button>
            : listening && embed
            ? <SpotifyFrame key={embed} className="ls-spotify" title={`${song.title} by ${song.artist} on Spotify`} src={embed} width="100%" height={80} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
            : <Button variant="listenPlay" size="round" aria-label={`Play ${song.title} by ${song.artist}`} onClick={onListen}><Play /></Button>}
          <Button variant="listenIcon" size="round" aria-label="Next song" onClick={onNext}><SkipForward /></Button>
        </div>
        {full ? <p className="ls-player-note">Full songs · Spotify Premium</p> : !(listening && embed) && <p className="ls-player-note">Plays through Spotify</p>}
      </div>
      {sheet && playing && !open && (
        <Button variant="listenIcon" size="round" className="ls-sheet-open" aria-label="Open full player" onClick={() => setExpanded(true)}><ChevronUp /></Button>
      )}
      {sheet && <div className="ls-sheet-shop" hidden={!open}>{shop}</div>}
      <div className="ls-player-tools">
        <Button variant="listenIcon" size="round" aria-pressed={wearingOpen} aria-controls={wearingOpen ? "now-wearing" : undefined} aria-label="Now wearing" title="Now wearing" onClick={() => onWearingChange(!wearingOpen)}><Shirt /></Button>
        <Button asChild variant="listenIcon" size="round"><a href={song.link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${song.title} in Spotify`} title="Open in Spotify"><ArrowUpRight /></a></Button>
      </div>
      {/* The listening room's mode line: its own row under the controls (full width on phones). */}
      {room && !open && <div className="ls-player-room">{room.switcher}</div>}
    </footer>
  );
}
