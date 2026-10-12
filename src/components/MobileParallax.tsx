import { useEffect } from "react";

/**
 * Phone/tablet-only scroll motion. Uses the independent `translate`/`scale`
 * CSS properties so it never fights existing `transform` hover/reveal effects.
 * Layers: [selector, depth px, zoom]. Positive depth drifts slower than scroll.
 */
const LAYERS: [string, number, number][] = [
  [".cover-title", -40, 1],          // headline floats up over the photo
  [".cover-subtitle", -24, 1],
  [".film-poster img", 36, 1.14],    // film still glides inside its frame
  [".iconic-frame .iconic-cover", 28, 1.16],
  [".playlist-feature img", 30, 1.14],
  [".want-look-image img", 24, 1.12],
  [".leaderboard", -18, 1],
  [".manifesto h2", -30, 1],
];
const REVEAL = ".iconic-card, .journal h2, .matrix h2, .archive h2, .circles-section h2, .manifesto p, .mlshop-card, .styling-note";

export function MobileParallax() {
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches || reduce.matches) return;

    let items: { el: HTMLElement; depth: number; zoom: number }[] = [];
    const collect = () => {
      items = LAYERS.flatMap(([sel, depth, zoom]) =>
        Array.from(document.querySelectorAll<HTMLElement>(sel)).map(el => ({ el, depth, zoom })));
      items.forEach(({ el, zoom }) => { el.style.willChange = "translate"; if (zoom !== 1) el.style.scale = String(zoom); });
    };
    let frame = 0;
    const tick = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const { el, depth } of items) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 around centre
        el.style.translate = `0 ${(p * depth).toFixed(1)}px`;
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(tick); };

    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("m-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    const observeReveals = () => document.querySelectorAll<HTMLElement>(REVEAL).forEach(el => {
      if (!el.classList.contains("m-reveal")) { el.classList.add("m-reveal"); io.observe(el); }
    });

    collect(); observeReveals(); tick();
    // Pick up cards that load later (shop feed, notes, circles).
    const mo = new MutationObserver(() => { collect(); observeReveals(); onScroll(); });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame); io.disconnect(); mo.disconnect();
      items.forEach(({ el }) => { el.style.translate = ""; el.style.scale = ""; el.style.willChange = ""; });
      document.querySelectorAll(".m-reveal").forEach(el => el.classList.remove("m-reveal", "m-in"));
    };
  }, []);
  return null;
}
