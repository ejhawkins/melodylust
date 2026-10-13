import { useEffect, useRef, useState } from "react";
import howHear from "@/assets/how-hear.jpg";
import howEvidence from "@/assets/how-evidence.jpg";
import howWear from "@/assets/how-wear.jpg";

/*
 * "How it works" — pinned step sequence, placed directly under the music video.
 * Native CSS sticky + one rAF scroll loop: same feel as GSAP/Lenis, no extra weight,
 * and native scrolling stays untouched on phones.
 * TIMINGS: --gs-reveal / --gs-ease come from .guided in styles.css.
 * CONTENT: edit the steps array below.
 */
const steps = [
  { title: "Hear it", body: "Start with a song you can't stop replaying — the mood is the brief.", image: howHear, alt: "Screenshot of the record stack: five album sleeves arced across the screen" },
  { title: "Find the evidence", body: "Stylist AI reads real articles and shows where the music and the clothes actually met.", image: howEvidence, alt: "Screenshot of the Stylist AI search: artist, song or genre" },
  { title: "Wear it your way", body: "Save pieces to The Want List and share how you'd style them in Styling Notes.", image: howWear, alt: "Screenshot of Styling Notes: share your note" },
];

// Closing line after step 03, set like "This is a mood": word groups of letter spans, revealed in view.
const runwayWords = ["BRING", "IT", "TO", "THE", "RUNWAY."];
const runwayLetters = runwayWords.map((word, wi) => ({ word, letters: word.split("").map((ch, ci) => ({ ch, delay: (runwayWords.slice(0, wi).reduce((n, w) => n + w.length, 0) + ci) * 45 })) }));

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function HowItWorks() {
  const pin = useRef<HTMLElement>(null);
  const closing = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [closingIn, setClosingIn] = useState(false);

  useEffect(() => {
    const el = closing.current;
    if (!el || typeof IntersectionObserver === "undefined") { setClosingIn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setClosingIn(true); io.disconnect(); } }, { threshold: .4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const w = pin.current;
    if (!w) return;
    let frame = 0;
    // PATTERN 2 — pinned steps: progress through the tall pin wrapper picks the active step.
    const tick = () => {
      frame = 0;
      const r = w.getBoundingClientRect();
      const p = Math.min(.999, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      setStep(Math.floor(p * steps.length));
    };
    const onScroll = () => { if (!frame && !reduced()) frame = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  return <div className="guided how-it-works" id="how-it-works" aria-label="How Melody Lust works">
    <section className="gs-card gs-paper gs-pin" ref={pin} style={{ height: `${steps.length * 100 + 40}vh` }}>
      <div className="gs-sticky">
        <div className="gs-steps">
          <span className="gs-eyebrow">How it works</span>
          <ol>{steps.map((s, i) => (
            <li key={s.title} data-active={i === step}>
              <span>0{i + 1}</span>
              <figure className="gs-shot"><img src={s.image} alt={s.alt} loading="lazy" /></figure>
              <div><h3>{s.title}</h3><p>{s.body}</p></div>
            </li>
          ))}</ol>
        </div>
      </div>
    </section>
    <div className="gs-closing" ref={closing} data-inview={closingIn}>
      <h2 className="film-title gs-closing-title" aria-label="Bring it to the runway.">{runwayLetters.map(({ word, letters }) => <span className="film-word" key={word} aria-hidden>{letters.map(({ ch, delay }, i) => <span key={i} style={{ transitionDelay: `${delay}ms` }}>{ch}</span>)}</span>)}</h2>
    </div>
  </div>;
}
