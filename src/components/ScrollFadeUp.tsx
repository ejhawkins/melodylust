import { useEffect } from "react";

// Soft fade-and-rise as content enters view, on every screen size.
const SEL = "main section h2, main section h3, main section p, main section img, main section .iconic-card, main section .iconic-circles-link, main section .mlshop-card, main section .styling-note, main section .circles-card";

export function ScrollFadeUp() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("fu-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    const scan = () => document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
      if (el.classList.contains("fu") || el.classList.contains("m-reveal") || el.closest("#cover, .song-collage-track, .fu")) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // already visible: leave alone
      el.classList.add("fu"); io.observe(el);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); document.querySelectorAll(".fu").forEach((el) => el.classList.remove("fu", "fu-in")); };
  }, []);
  return null;
}
