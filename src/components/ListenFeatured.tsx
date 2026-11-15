import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Play, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { step, type MixSong } from "@/lib/listening-room";
import { spotifyTrackId, useAlbumArt } from "@/lib/album-art";
import { swipeStep, trackCounter, upNext } from "@/lib/featured-playlist";

/** The Featured tab: The Autumn Mix one cover at a time, over a blurred wash of the same cover, with its place in the
 *  playlist, what comes next and a strip of every cover. The buttons, a swipe or a thumbnail choose a song; Play hands
 *  it to the room's player bar. Full screen lays the same stage over the whole page until Escape or the close button. */
export function ListenFeatured({ songs, current, onPlay }: {
  songs: readonly MixSong[];
  /** The mix song the player holds while it plays, or null when the room is playing something else or nothing. */
  current: number | null;
  onPlay: (index: number) => void;
}) {
  const [at, setAt] = useState(current ?? 0);
  const [full, setFull] = useState(false);
  const strip = useRef<HTMLOListElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const count = songs.length;

  // The player's own next and previous buttons move the tab along with them.
  useEffect(() => { if (current !== null) setAt(current); }, [current]);
  // Keep the chosen thumbnail in the middle of its strip, without moving the page.
  useEffect(() => {
    const rail = strip.current;
    const thumb = rail?.querySelector<HTMLElement>("[aria-current='true']");
    if (rail && thumb) rail.scrollTo({ left: thumb.offsetLeft - (rail.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
  }, [at]);
  // Full screen: the page behind stops scrolling, the close button takes focus, and the keyboard closes or steps.
  useEffect(() => {
    if (!full) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setFull(false); }
      else if (e.key === "ArrowLeft") setAt(i => step(count, i, -1));
      else if (e.key === "ArrowRight") setAt(i => step(count, i, 1));
    };
    window.addEventListener("keydown", onKey);
    // By the time this runs the page's own stage is back, and with it the button that opened full screen.
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey); opener.current?.focus(); };
  }, [full, count]);

  const song = songs[Math.min(at, count - 1)];
  // Spotify's own cover is sharper than the one filed with the song; that one shows until (or unless) it arrives.
  const fetched = useAlbumArt(song ? spotifyTrackId(song.link) : null);
  if (!song) return null;
  const art = fetched ?? song.art;
  const next = upNext(songs, at);
  const move = (by: number) => setAt(i => step(count, i, by));
  const swipe = {
    onPointerDown: (e: PointerEvent) => { down.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: PointerEvent) => {
      const from = down.current;
      down.current = null;
      if (!from) return;
      const by = swipeStep(e.clientX - from.x, e.clientY - from.y);
      if (by) move(by);
    },
    onPointerCancel: () => { down.current = null; },
  };

  const stage = (
    <div className="ls-feat-stage" {...swipe}>
      <div key={`bg-${song.caption}`} className="ls-feat-bg" style={{ backgroundImage: `url("${art}")` }} aria-hidden />
      <div className="ls-feat-art"><img key={song.caption} src={art} alt={song.alt} width={640} height={640} draggable={false} /></div>
      <div className="ls-feat-caption">
        <div aria-live="polite">
          <p className="ls-feat-count">{trackCounter(at, count)}{current === at && <span className="ls-feat-now"> · Now playing</span>}</p>
          <p className="ls-feat-title">{song.title}</p>
          <p className="ls-feat-artist">{song.artist}</p>
        </div>
        <div className="ls-feat-controls">
          <Button variant="listenOutline" size="round" className="ls-feat-step" aria-label="Previous song" onClick={() => move(-1)}><SkipBack /></Button>
          <Button variant="listenPlay" size="round" className="ls-feat-play" aria-label={`Play ${song.title} by ${song.artist}`} onClick={() => onPlay(at)}><Play /></Button>
          <Button variant="listenOutline" size="round" className="ls-feat-step" aria-label="Next song" onClick={() => move(1)}><SkipForward /></Button>
          {full
            ? <Button ref={close} variant="listenOutline" size="round" className="ls-feat-step ls-feat-screen" aria-label="Close full screen" title="Close full screen" onClick={() => setFull(false)}><X /></Button>
            : <Button ref={opener} variant="listenOutline" size="round" className="ls-feat-step ls-feat-screen" aria-label="Open full screen" title="Open full screen" onClick={() => setFull(true)}><Maximize2 /></Button>}
        </div>
        {next && <p className="ls-feat-next-up"><span>Up next</span> {next.title} — {next.artist}</p>}
      </div>
    </div>
  );

  return (
    <section id="featured-playlist" className="ls-section ls-feat" aria-labelledby="ls-feat-title">
      <div className="ls-section-head">
        <h2 id="ls-feat-title">The Autumn <span className="ls-two-face-xxx">Mix</span></h2>
        <span>Featured playlist</span>
      </div>
      {/* While full screen is up the stage lives there alone, so its buttons and live text aren't on the page twice. */}
      {!full && stage}
      <ol className="ls-feat-strip" ref={strip} aria-label="Songs in The Autumn Mix">
        {songs.map((s, i) => <li key={s.caption}>
          <Button variant="listenTile" size="block" className="ls-feat-thumb" aria-current={i === at} aria-label={`Show ${s.title} by ${s.artist}`} onClick={() => setAt(i)}>
            <img src={s.art} alt="" width={96} height={96} loading="lazy" />
          </Button>
        </li>)}
      </ol>
      {/* Portalled to the room's root: a moving ancestor would otherwise trap a fixed overlay inside the feed. */}
      {full && createPortal(
        <div className="ls-feat ls-feat-full" role="dialog" aria-modal="true" aria-label="The Autumn Mix, full screen">{stage}</div>,
        document.querySelector(".ls") ?? document.body,
      )}
    </section>
  );
}
