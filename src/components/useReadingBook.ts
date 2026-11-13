import { useEffect, useRef, useState, type RefObject } from "react";
import type { PageFlip, SizeType } from "page-flip";

const KEY = "ml-reading-room-page";
export function useReadingBook(enabled: boolean, source: RefObject<HTMLDivElement | null>, mount: RefObject<HTMLDivElement | null>) {
  const book = useRef<PageFlip | null>(null);
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [plain, setPlain] = useState(false);
  const change = useRef<(page: number) => void>(() => {});
  useEffect(() => {
    if (!enabled || !mount.current || !source.current) return;
    const container = mount.current;
    const originals = source.current;
    let cancelled = false;
    let instance: PageFlip | null = null;
    let host: HTMLDivElement | null = null;
    let current = 0;
    try { current = Math.max(0, Math.min(6, Number(localStorage.getItem(KEY)) || 0)); } catch { /* private browsing */ }
    setPage(current);
    const update = (next: number) => {
      current = Math.max(0, Math.min(6, next)); setPage(current);
      try { localStorage.setItem(KEY, String(current)); } catch { /* storage unavailable */ }
    };
    const fallback = () => {
      if (cancelled) return;
      instance?.destroy(); instance = null; book.current = null;
      host?.remove(); host = document.createElement("div"); host.className = "zine-plain";
      const pages = Array.from(originals.children).map(node => node.cloneNode(true) as HTMLElement);
      pages.forEach((node, index) => { node.hidden = index !== current; host?.appendChild(node); });
      container.appendChild(host);
      change.current = next => { update(next); pages.forEach((node, index) => { node.hidden = index !== current; }); };
      setPlain(true); setReady(true);
    };
    const load = async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { fallback(); return; }
      try {
        const { PageFlip } = await import("page-flip");
        if (cancelled) return;
        host = document.createElement("div"); host.className = "zine-book"; container.appendChild(host);
        const pages = Array.from(originals.children).map(node => node.cloneNode(true) as HTMLElement);
        pages.forEach(node => host?.appendChild(node));
        const width = Math.max(160, Math.floor(container.clientWidth));
        instance = new PageFlip(host, { width, height: Math.round(width * 460 / 340), size: "fixed" as SizeType, showCover: true, usePortrait: true, autoSize: false, useMouseEvents: false, mobileScrollSupport: true, flippingTime: 400, maxShadowOpacity: 0.2 });
        const restoredPage = current;
        instance.loadFromHTML(pages); instance.turnToPage(restoredPage); book.current = instance;
        setPage(restoredPage);
        instance.on("flip", event => update(Number(event.data)));
        change.current = next => { const clamped = Math.max(0, Math.min(6, next)); instance?.flip(clamped); };
        setReady(true);
      } catch { fallback(); }
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); void load(); } }, { rootMargin: "100px" });
    observer.observe(container);
    return () => { cancelled = true; observer.disconnect(); book.current = null; instance?.destroy(); host?.remove(); change.current = () => {}; };
  }, [enabled]);
  return { page, ready, plain, turn: (next: number) => change.current(next) };
}