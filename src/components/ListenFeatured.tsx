import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { step, type MixSong } from "@/lib/listening-room";
import { swipeStep, trackCounter, upNext } from "@/lib/featured-playlist";

/** The Featured tab: The Autumn Mix one cover at a time, with its place in the playlist, what comes next and a strip of
 *  every cover. Arrows, a swipe or a thumbnail choose a song; Play hands it to the room's player bar. Full screen shows
 *  the same playlist in a modal dialog, which the browser closes on Escape. */
export function ListenFeatured({ songs, playing, onPlay }: {
  songs: readonly MixSong[];
  /** The mix song the player holds while it plays, or null when the room is playing something else or nothing. */
  playing: number | null;
  onPlay: (index: number) => void;
}) {
  const [at, setAt] = useState(playing ?? 0);
  const [full, setFull] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  // The player's own next and previous buttons move the tab along with them.
  useEffect(() => { if (playing !== null) setAt(playing); }, [playing]);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (full && !d.open) d.showModal();
    if (!full && d.open) d.close();
  }, [full]);
  // Keep the chosen thumbnail in the middle of its strip, without moving the page.
  useEffect(() => {
    const rail = strip.current;
    const thumb = rail?.querySelector<HTMLElement>("[aria-current='true']");
    if (rail && thumb) rail.scrollTo({ left: thumb.offsetLeft - (rail.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
  }, [at]);

  const song = songs[Math.min(at, songs.length - 1)];
  if (!song) return null;
  const next = upNext(songs, at);
  const move = (by: number) => setAt(i => step(songs.length, i, by));
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
      <img key={song.caption} className="ls-feat-cover" src={song.art} alt={song.alt} width={640} height={640} draggable={false} />
      <Button variant="listenIcon" size="round" className="ls-feat-arrow ls-feat-prev" aria-label="Previous song" onClick={() => move(-1)}><ChevronLeft /></Button>
      <Button variant="listenIcon" size="round" className="ls-feat-arrow ls-feat-next" aria-label="Next song" onClick={() => move(1)}><ChevronRight /></Button>
    </div>
  );
  const info = (
    <div className="ls-feat-info" aria-live="polite">
      <p className="ls-feat-count">{trackCounter(at, songs.length)}{playing === at && <span className="ls-feat-now"> · Now playing</span>}</p>
      <p className="ls-feat-title">{song.title}</p>
      <p className="ls-feat-artist">{song.artist}</p>
      {next && <p className="ls-feat-next-up"><span>Up next</span> {next.title} — {next.artist}</p>}
    </div>
  );
  const playButton = (
    <Button variant="listenPlay" size="round" className="ls-feat-play h-12 w-12" aria-label={`Play ${song.title} by ${song.artist}`} onClick={() => onPlay(at)}><Play /></Button>
  );

  return (
    <section className="ls-section ls-feat" aria-labelledby="ls-feat-title">
      <div className="ls-section-head">
        <h2 id="ls-feat-title">The Autumn <span className="ls-two-face-xxx">Mix</span></h2>
        <span>Featured playlist</span>
      </div>
      <div className="ls-feat-body">
        {stage}
        <div className="ls-feat-side">
          {info}
          <div className="ls-feat-actions">
            {playButton}
            <Button variant="listenIcon" size="round" className="ls-feat-tool" aria-label="Full screen" title="Full screen" onClick={() => setFull(true)}><Maximize2 /></Button>
          </div>
        </div>
      </div>
      <ol className="ls-feat-strip" ref={strip} aria-label="Songs in The Autumn Mix">
        {songs.map((s, i) => <li key={s.caption}>
          <Button variant="listenTile" size="block" className="ls-feat-thumb" aria-current={i === at} aria-label={`Show ${s.title} by ${s.artist}`} onClick={() => setAt(i)}>
            <img src={s.art} alt="" width={96} height={96} loading="lazy" />
          </Button>
        </li>)}
      </ol>

      <dialog ref={dialog} className="ls-feat-full" aria-label="The Autumn Mix, full screen" onClose={() => setFull(false)}
        onKeyDown={e => { if (e.key === "ArrowLeft") move(-1); else if (e.key === "ArrowRight") move(1); }}>
        {full && <>
          <div className="ls-feat-full-head">
            <p className="ls-feat-full-name">The Autumn <span className="ls-two-face-xxx">Mix</span></p>
            <Button variant="listenIcon" size="round" className="ls-feat-tool" aria-label="Close full screen" onClick={() => setFull(false)}><X /></Button>
          </div>
          {stage}
          <div className="ls-feat-full-foot">{info}{playButton}</div>
        </>}
      </dialog>
    </section>
  );
}
