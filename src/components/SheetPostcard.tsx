import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { Disc3 } from "lucide-react";
import { prefersReducedMotion } from "@/components/useRoomMotion";
import { blendPath, mixGenres, type Genre } from "@/lib/genre-shapes";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** A song title in the two Hammer cuts, word about: WTF Hammer Compressed, then WTF Hammer XXX Compressed. Each word sits
 *  in a mask so it can be written in; the spaces stay text between them. */
export function HammerTitle({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(/\s+/).filter(Boolean).map((word, i) => (
        <Fragment key={i}>{i > 0 && " "}<span className="ls-mask"><span className="ls-mask-in" data-cut={i % 2 ? "xxx" : "hammer"}>{word}</span></span></Fragment>
      ))}
    </span>
  );
}

/**
 * The Now Playing sheet's cover as a postcard. Each new song arrives back first, small: a plain dark card with the song's
 * genre drawn in acid lime from the shape lexicon. The track and artist under it are written in word by word, then the
 * card flips over and zooms up into the album cover. Spotify's public embed and API carry no Canvas videos, so the front
 * is always the cover. A song with no genres on file takes Pop's shape, the round hook. Reduced motion shows the cover
 * straight away.
 */
export function SheetPostcard({ art, title, artist, genres }: { art: string | undefined; title: string; artist: string; genres?: readonly Genre[] | undefined }) {
  const card = useRef<HTMLDivElement>(null);
  const shape = useMemo(() => blendPath(genres?.length ? mixGenres([{ genres }]) : { Pop: 1 }, 50, 50, 34), [genres]);
  useIsoLayoutEffect(() => {
    const el = card.current;
    if (!el || prefersReducedMotion()) return;
    const inner = el.querySelector(".ls-postcard-inner");
    const mark = el.querySelector(".ls-postcard-shape");
    // The sheet's own title and artist, written in before the card turns.
    const words = el.closest(".ls-player")?.querySelectorAll(".ls-player-song .ls-mask-in") ?? [];
    // Which face shows is set by the card's turn, not left to backface-visibility, which WebKit can drop when it renders
    // without 3D acceleration: past edge-on (90 degrees) it's the back, before it the cover.
    const side = () => { el.dataset["side"] = Math.abs(Number(gsap.getProperty(inner, "rotateY"))) > 90 ? "back" : "front"; };
    const ctx = gsap.context(() => {
      gsap.timeline({ onUpdate: side, onComplete: side })
        .set(inner, { rotateY: 180, scale: 0.6, y: 24 })
        .set(words, { yPercent: 115 })
        .set(mark, { scale: 0, rotate: -40, transformOrigin: "50% 50%" })
        .to(mark, { scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.6)" })
        .to(words, { yPercent: 0, duration: 0.7, ease: "power4.out", stagger: 0.08 }, "-=0.5")
        // A beat to take it in, then over it goes: the flip and the zoom together, the lift settling last.
        .to(inner, { rotateY: 0, scale: 1, duration: 1.1, ease: "power3.inOut" }, "+=0.5")
        .to(inner, { y: 0, duration: 0.8, ease: "power2.out" }, "<0.3");
    }, el);
    side();
    return () => { ctx.revert(); el.dataset["side"] = "front"; };
  }, [title, artist]);

  return (
    <div ref={card} className="ls-postcard" data-side="front" aria-hidden="true">
      <div className="ls-postcard-inner">
        <div className="ls-postcard-face ls-postcard-front">
          {art ? <img src={art} alt="" width={600} height={600} /> : <span className="ls-player-blank"><Disc3 /></span>}
        </div>
        <div className="ls-postcard-face ls-postcard-back">
          <svg viewBox="0 0 100 100"><path className="ls-postcard-shape" d={shape} /></svg>
        </div>
      </div>
    </div>
  );
}
