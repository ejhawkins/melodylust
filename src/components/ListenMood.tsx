import { useEffect, useRef, useState } from "react";
import { RecordStack } from "@/components/RecordStack";

// "This is a mood" for the listening room: the home page's music-video chapter (headline, record stack and film), sized to
// the feed column instead of the window. Word groups of letter spans, revealed once the block is in view.
const words = ["THIS", "IS", "A", "MOOD"];
const letters = words.map((word, wi) => ({ word, letters: word.split("").map((ch, ci) => ({ ch, delay: (words.slice(0, wi).reduce((n, w) => n + w.length, 0) + ci) * 45 })) }));

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
      <div className="film-head">
        <h2 className="film-title" aria-label="This is a mood">{letters.map(({ word, letters: chars }) => <span className="film-word" key={word} aria-hidden>{chars.map(({ ch, delay }, i) => <span key={i} style={{ transitionDelay: `${delay}ms` }}>{ch}</span>)}</span>)}</h2>
        <span className="film-credit">I do not own any of the vibes below</span>
        <span className="film-rule" aria-hidden="true" />
      </div>
      <RecordStack />
    </section>
  );
}
