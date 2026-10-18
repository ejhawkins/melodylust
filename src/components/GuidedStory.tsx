import { useEffect, useRef, useState } from "react";
import street from "@/assets/street-style.jpg";
import runway from "@/assets/hero-runway-3.jpg";
import boot from "@/assets/editorial-pick-2.jpg";
import nicole from "@/assets/nicole-kidman.jpg";
import charli from "@/assets/charli-rock-music.webp";
import slayyyter from "@/assets/slayyyter-dance.jpg";
import { featuredNote, HOUSE_NOTE } from "@/lib/featured-note";
import { listApprovedStylingNotes } from "@/lib/styling-notes.functions";

/*
 * Guided story — calm, scroll-led chapters (askmidnight-style rhythm).
 * Native CSS sticky + one rAF scroll loop instead of GSAP/Lenis: same feel,
 * no extra weight, and native scrolling stays untouched on phones.
 * TIMINGS: edit --gs-reveal / --gs-ease in styles.css (.guided).
 * CONTENT: edit the arrays below.
 */
const tabs = [
  { name: "Grunge", heading: "Worn-in, turned up", quote: "“Comfort is the loudest statement.”", body: "Flannel, slip dresses and boots that have seen a few shows — paired with fuzz-heavy guitars.", image: charli },
  { name: "After dark", heading: "Patent and bass", quote: "“Dress for the second half of the night.”", body: "High shine, sharp shoulders and club records that keep the room moving.", image: slayyyter },
  { name: "Quiet luxury", heading: "Soft volume", quote: "“Let the fabric do the talking.”", body: "Cashmere, camel and tailoring that listens to slow, warm soul.", image: nicole },
];
// The story from look to cart; the closing card offers one way in for each step.
const features = [
  { title: "Featured looks", body: "The outfits that defined a song's moment, from runway to red carpet to street, each one sourced.", image: runway },
  // Opinions shows the featured Styling Note (see featured-note.ts); the street look is its photo until a note brings one.
  { title: "Opinions", body: "A stylist's read on why the look works, and readers' notes on how they'd wear it.", image: street, opinion: true },
  { title: "Products", body: "Live pieces with sizes, store links and a fall look for each, picked to rebuild the outfit.", image: boot },
];
const ctas = [
  { label: "Find your look", href: "#search" },
  { label: "Shop the pieces", href: "#shop" },
  { label: "Share your note", href: "#styling-notes" },
];
const faqs = [
  { q: "Is Melody Lust affiliated with these brands?", a: "No. It's an independent journal meant for inspiration only." },
  { q: "Where do the connections come from?", a: "Documented links carry public sources. Anything based only on shared genres is labelled “Suggested discovery”." },
  { q: "Do I need an account?", a: "Only to post Styling Notes. Browsing, searching and your Want List work without one." },
  { q: "Who reviews Styling Notes?", a: "Every note waits for a moderator before it appears publicly." },
];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * Standalone quote card — placed directly under the How it works section.
 * Same paper card and reveal, with its own IntersectionObserver so it
 * fades in on first sight even outside the full guided-story flow.
 */
export function GuidedStoryQuote() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current; if (!el) return;
    if (reduced()) { el.querySelectorAll(".gs-reveal").forEach(n => n.classList.add("is-in")); return; }
    if (typeof IntersectionObserver === "undefined") { el.querySelectorAll(".gs-reveal").forEach(n => n.classList.add("is-in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }), { rootMargin: "-20% 0px -20% 0px" });
    el.querySelectorAll(".gs-reveal").forEach(n => io.observe(n));
    let raf = 0;
    const tick = () => { raf = 0; const r = el.getBoundingClientRect(); const p = (window.innerHeight - r.top) / (window.innerHeight + r.height); el.style.setProperty("--qp", String(Math.max(0, Math.min(1, p)) - .5)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return <div className="guided" aria-label="Melody Lust">
    <section className="gs-card gs-paper gs-quote" ref={root}>
      <div className="gs-quote-drift">
        <blockquote className="gs-reveal">“The song comes first.<br />The outfit just agrees.”</blockquote>
        <p className="gs-reveal">— Melody Lust, Vol. 01</p>
      </div>
    </section>
  </div>;
}

export function GuidedStory() {
  const root = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const [feature, setFeature] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const [note, setNote] = useState(HOUSE_NOTE);

  // The newest approved Styling Note becomes the Opinions step; if none loads, the house note stays.
  useEffect(() => {
    let live = true;
    listApprovedStylingNotes().then(r => { if (live) setNote(featuredNote(r.notes)); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const el = root.current; if (!el) return;
    // PATTERN 5 — card stack: outgoing chapter scales down + dims as the next slides over it.
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".gs-card"));
    let frame = 0;
    const tick = () => {
      frame = 0;
      const vh = window.innerHeight;
      if (!reduced()) cards.forEach((c, i) => {
        const next = cards[i + 1]; if (!next) return;
        const p = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh));
        c.style.setProperty("--gs-out", p.toFixed(3));
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(tick); };
    // Reveals + PATTERN 4 feature activation.
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      const f = (e.target as HTMLElement).dataset["feature"];
      if (f !== undefined) setFeature(Number(f));
    }), { rootMargin: "-35% 0px -35% 0px" });
    el.querySelectorAll(".gs-reveal, [data-feature]").forEach(n => io.observe(n));
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { io.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  return <div className="guided" ref={root} aria-label="How Melody Lust works">

    {/* PATTERN 3 — tabbed use cases, panel slides horizontally */}
    <section className="gs-card gs-ink gs-tabs">
      <span className="gs-eyebrow">Three moods</span>
      <div role="tablist" className="gs-tablist">{tabs.map((t, i) => <button key={t.name} role="tab" aria-selected={i === tab} onClick={() => setTab(i)}>{t.name}</button>)}</div>
      <div className="gs-tabwindow"><div className="gs-tabtrack" style={{ transform: `translateX(-${tab * 100}%)` }}>
        {tabs.map((t, i) => <article key={t.name} role="tabpanel" aria-hidden={i !== tab} className="gs-tabpanel">
          <img src={t.image} alt={t.heading} loading="lazy" />
          <div><h3>{t.heading}</h3><q>{t.quote.replace(/[“”]/g, "")}</q><p>{t.body}</p></div>
        </article>)}
      </div></div>
    </section>

    {/* PATTERN 4 — feature stack with sticky visual */}
    <section className="gs-card gs-paper gs-features">
      <div className="gs-feature-list">{features.map((f, i) => <div key={f.title} data-feature={i} data-active={i === feature} className="gs-feature"><span>0{i + 1}</span><h3>{f.title}</h3><p>{f.body}</p></div>)}</div>
      <div className="gs-feature-visual">{features.map((f, i) => f.opinion
        ? <figure key={f.title} className="gs-note" data-active={i === feature} data-readers={note.fromReaders || undefined}>
            <img src={note.image ?? f.image} alt={note.image ? note.alt : ""} loading="lazy" />
            <div className="gs-note-copy">
              <span>{note.kicker}</span>
              <blockquote>“{note.quote}”</blockquote>
              <figcaption>— {note.by}{note.song && <span className="gs-note-song">On repeat: {note.song}</span>}</figcaption>
              {note.fromReaders && <a href="#styling-notes" className="gs-note-link">Read more Styling Notes</a>}
            </div>
          </figure>
        : <img key={f.title} src={f.image} alt="" data-active={i === feature} loading="lazy" />)}</div>
    </section>

    {/* PATTERN 6 — FAQ accordion (grid-rows height animation) */}
    <section className="gs-card gs-paper gs-faq">
      <h2 className="gs-reveal">Questions</h2>
      {faqs.map((f, i) => <div key={f.q} className="gs-faq-item" data-open={open === i}>
        <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{f.q}<span aria-hidden="true">+</span></button>
        <div className="gs-faq-body"><p>{f.a}</p></div>
      </div>)}
    </section>

    {/* PATTERN 7 — closing CTAs with slow gradient */}
    <section className="gs-card gs-cta">
      <h2 className="gs-reveal">Bring a song.<br />Leave with a look.</h2>
      <div className="gs-cta-actions">{ctas.map((c, i) => <a key={c.href} href={c.href} className={i ? "gs-button gs-button--line" : "gs-button"}>{c.label}</a>)}</div>
    </section>
  </div>;
}
