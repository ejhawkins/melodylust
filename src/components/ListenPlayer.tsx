import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Disc3, Play, Shirt, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findWish, spotifyEmbed, type MixSong } from "@/lib/listening-room";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";

/** The listening room's player bar. Playback is Spotify's own embedded player, loaded only once
 *  the reader presses play; before that nothing from Spotify loads on the page. */
export function ListenPlayer({ song, listening, onListen, onPrev, onNext, wearingOpen, onWearingChange, sheet = false, shop }: {
  song: MixSong;
  listening: boolean;
  onListen: () => void;
  onPrev: () => void;
  onNext: () => void;
  wearingOpen: boolean;
  onWearingChange: (open: boolean) => void;
  /** Phones: once a song plays, the bar slides up into a full-screen Now Playing sheet on the same page. */
  sheet?: boolean;
  shop?: ReactNode;
}) {
  const items = useWishlist();
  const saved = findWish(items, "song", song.caption);
  const embed = spotifyEmbed(song.link);
  const playing = listening && embed !== null;
  const [expanded, setExpanded] = useState(false);
  // Each new song opens the sheet again; the same element stays mounted, so Spotify keeps playing.
  useEffect(() => { setExpanded(sheet && playing); }, [sheet, playing, song.caption]);
  const open = sheet && playing && expanded;

  return (
    <footer className="ls-player" aria-label="Player" data-listening={playing} data-expanded={open}>
      {open && (
        <div className="ls-sheet-head">
          <span className="ls-sheet-label">Now playing</span>
          <Button variant="listenIcon" size="round" aria-label="Minimize player" onClick={() => setExpanded(false)}><ChevronDown /></Button>
        </div>
      )}
      {open && (song.art ? <img className="ls-sheet-art" src={song.art} alt="" width={600} height={600} /> : <span className="ls-sheet-art ls-player-blank" aria-hidden><Disc3 /></span>)}
      <div className="ls-player-song">
        {song.art ? <img src={song.art} alt="" width={56} height={56} /> : <span className="ls-player-blank" aria-hidden><Disc3 /></span>}
        <div className="ls-row-text">
          <p className="ls-player-title">{song.title}</p>
          <p className="ls-player-artist">{song.artist}</p>
        </div>
        <Button variant="listenIcon" size="round" aria-pressed={Boolean(saved)} aria-label={saved ? `Remove ${song.title} from your Want List` : `Save ${song.title} to your Want List`}
          onClick={() => (saved ? removeWish(saved.id) : addWish({ kind: "song", name: song.caption, detail: "", link: song.link, note: "" }))}>{saved ? <BookmarkCheck /> : <Bookmark />}</Button>
      </div>
      <div className="ls-player-center">
        <div className="ls-player-controls">
          <Button variant="listenIcon" size="round" aria-label="Previous song" onClick={onPrev}><SkipBack /></Button>
          {listening && embed
            ? <iframe key={embed} className="ls-spotify" title={`${song.title} by ${song.artist} on Spotify`} src={embed} width="100%" height={80} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
            : <Button variant="listenPlay" size="round" aria-label={`Play ${song.title} by ${song.artist}`} onClick={onListen}><Play /></Button>}
          <Button variant="listenIcon" size="round" aria-label="Next song" onClick={onNext}><SkipForward /></Button>
        </div>
        {!(listening && embed) && <p className="ls-player-note">Plays through Spotify</p>}
      </div>
      {sheet && playing && !open && (
        <Button variant="listenIcon" size="round" className="ls-sheet-open" aria-label="Open full player" onClick={() => setExpanded(true)}><ChevronUp /></Button>
      )}
      {sheet && <div className="ls-sheet-shop" hidden={!open}>{shop}</div>}
      <div className="ls-player-tools">
        <Button variant="listenIcon" size="round" aria-pressed={wearingOpen} aria-controls={wearingOpen ? "now-wearing" : undefined} aria-label="Now wearing" title="Now wearing" onClick={() => onWearingChange(!wearingOpen)}><Shirt /></Button>
        <Button asChild variant="listenIcon" size="round"><a href={song.link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${song.title} in Spotify`} title="Open in Spotify"><ArrowUpRight /></a></Button>
      </div>
    </footer>
  );
}
