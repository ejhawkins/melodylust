import { useEffect, type RefObject } from "react";

/** What rises into place as it scrolls into view: each block of the feed and of an opened view, and each card in a grid. */
const REVEAL = [
  // The film block has a scroll-in reveal of its own.
  "main.ls-center > :not(.ls-shelf-pills, .ls-back-top, .ls-film)",
  ".ls-studio ul > li",
  ".ls-want-shelf-pieces > li",
  ".ls-want-shelf-songs > li",
  ".ls-board > :not(.ls-board-head)",
  ".ls-rn-cards > li",
  ".ls-notes > li",
  ".ls-board-grid > li",
  ".ls-cap-nodes > li",
].join(", ");

export const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll reveals for the Listening Room: a block waits a little below and fades in as it enters the viewport, cards in a
 * row one after another. Content is only ever hidden once this has run (it marks <html> first), so the page reads in full
 * without JavaScript, and nothing moves when the reader asks for reduced motion. New blocks (a view opening, a shelf
 * unfolding) are picked up as React adds them.
 */
export function useRoomMotion(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return;
    document.documentElement.classList.add("ml-motion");
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset["reveal"] = "in";
        io.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -6% 0px" });
    const scan = () => {
      for (const target of el.querySelectorAll<HTMLElement>(REVEAL)) {
        // "out" ones are observed again: a re-run (a hot reload) starts a fresh observer, and they must still arrive.
        if (target.dataset["reveal"] === "in") continue;
        target.dataset["reveal"] = "out";
        // Siblings that come in together arrive one after another, the stagger capped so a long grid doesn't lag.
        const index = target.parentElement ? Array.prototype.indexOf.call(target.parentElement.children, target) : 0;
        target.style.setProperty("--reveal-i", String(Math.min(index, 6)));
        io.observe(target);
      }
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); document.documentElement.classList.remove("ml-motion"); };
  }, [root]);
}
