import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "@/components/useRoomMotion";

/** How far each layer travels while the cover scrolls away, as a share of its own height. Kept in step with the
 *  ls-hero-back / ls-hero-front keyframes in styles.css, which do the same job where the browser can. */
export const HERO_BACK = 0.35;
export const HERO_FRONT = -0.3;

/** How far the cover has scrolled out of the top of its scroller: 0 until its top edge reaches the top, 1 once it is gone. */
export function exitProgress(coverTop: number, coverHeight: number, scrollerTop: number) {
  if (coverHeight <= 0) return 0;
  return Math.min(1, Math.max(0, (scrollerTop - coverTop) / coverHeight));
}

const scrollerOf = (el: HTMLElement): HTMLElement | Window => {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if ((y === "auto" || y === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
};

/**
 * The hero's parallax for browsers without scroll-driven animations: the photos and the film drift down slower than the
 * page while the title rises faster and fades. Where `animation-timeline: view()` works, CSS does this and this stays
 * idle; it never runs for readers who ask for reduced motion. It listens only while the cover is on screen.
 */
export function useHeroParallax(cover: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = cover.current;
    if (!el || prefersReducedMotion()) return;
    if (typeof CSS !== "undefined" && CSS.supports("(animation-timeline: view()) and (animation-range: entry)")) return;
    const back = el.querySelector<HTMLElement>(".ls-hero-depth");
    const front = [...el.querySelectorAll<HTMLElement>(":scope > .ls-hero-title, :scope > .ls-hero-kicker")];
    const scroller = scrollerOf(el);
    let frame = 0;
    const paint = () => {
      frame = 0;
      const top = scroller === window ? 0 : (scroller as HTMLElement).getBoundingClientRect().top;
      const box = el.getBoundingClientRect();
      const p = exitProgress(box.top, box.height, top);
      if (back) back.style.transform = `translateY(${p * HERO_BACK * 100}%) scale(${1 + p * 0.06})`;
      for (const f of front) { f.style.transform = `translateY(${p * HERO_FRONT * 100}%)`; f.style.opacity = String(1 - p * 0.8); }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { scroller.addEventListener("scroll", onScroll, { passive: true }); paint(); }
      else scroller.removeEventListener("scroll", onScroll);
    });
    io.observe(el);
    return () => { io.disconnect(); scroller.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [cover]);
}
