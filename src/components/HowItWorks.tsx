import { useEffect, useRef, useState } from "react";
import street from "@/assets/street-style.jpg";
import coverStory from "@/assets/cover-story.jpg";
import kidCudi from "@/assets/day-n-nite.jpg";

/*
 * "How it works" — pinned step sequence, placed directly under the music video.
 * Native CSS sticky + one rAF scroll loop: same feel as GSAP/Lenis, no extra weight,
 * and native scrolling stays untouched on phones.
 * TIMINGS: --gs-reveal / --gs-ease come from .guided in styles.css.
 * CONTENT: edit the steps array below.
 */
const steps = [
  { title: "Hear it", body: "Start with a song you can't stop replaying — the mood is the brief.", image: kidCudi, alt: "Kid Cudi Day 'n' Nite artwork" },
  { title: "Find the evidence", body: "Stylist AI reads real articles and shows where the music and the clothes actually met.", image: coverStory, alt: "Editorial cover story" },
  { title: "Wear it your way", body: "Save pieces to The Want List and share how you'd style them in Styling Notes.", image: street, alt: "Street style look" },
];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function HowItWorks() {
  const pin = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

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
          <ol>{steps.map((s, i) => <li key={s.title} data-active={i === step}><span>0{i + 1}</span><div><h3>{s.title}</h3><p>{s.body}</p></div></li>)}</ol>
        </div>
        <div className="gs-visual">{steps.map((s, i) => <img key={s.title} src={s.image} alt={s.alt} data-active={i === step} loading="lazy" />)}</div>
      </div>
    </section>
  </div>;
}
