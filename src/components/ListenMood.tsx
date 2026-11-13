import { useEffect, useRef, useState } from "react";
import { RecordStack } from "@/components/RecordStack";

// The listening room's music-video chapter (record stack and film), sized to the feed column instead of the window.

export function ListenMood() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: .1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="film ls-film" ref={ref} data-inview={inView} aria-label="This is a mood">
      <RecordStack likes />
    </section>
  );
}
