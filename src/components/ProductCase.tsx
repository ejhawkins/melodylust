import { useEffect, useRef, useState } from "react";

/*
 * "The case" — the product brief on /home, set as a six-part case file:
 * target user, pain point, gap in the market, solution, AI tools used, success metrics.
 * CONTENT: edit the arrays below. The AI tools are the ones this codebase actually calls;
 * the metrics are what we track, so no figures are claimed until there are real ones.
 */
const tools = [
  { name: "Gemini 3.8 Flash", use: "Runway show notes, grounded in Google Search with cited sources" },
  { name: "GPT-5 mini", use: "The article scout and Stylist AI's look suggestions" },
  { name: "Claude", use: "An optional reader for the research, run from the Mac" },
  { name: "Vercel AI SDK", use: "One interface across every model, kept server-side" },
  { name: "Lovable", use: "Product build and hosting" },
  { name: "Claude Code", use: "Engineering, QA and SEO passes" },
];

const metrics = [
  { label: "Quiz completion", note: "Readers who finish the style quiz and keep a taste profile" },
  { label: "Search to save", note: "Stylist AI searches that end with a piece on The Want List" },
  { label: "Cited answers", note: "Share of AI answers that carry a working source" },
  { label: "Return listens", note: "Readers back each week for the runway radio and playlists" },
  { label: "Styling Notes", note: "Reader looks posted and approved each week" },
];

export function ProductCase() {
  const root = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: .12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <section className="case" id="the-case" ref={root} data-inview={inView} aria-labelledby="case-title">
    <header className="case-head">
      <p className="case-kicker">+ Case file / Melody Lust</p>
      <h2 className="case-title" id="case-title">The case for dressing to the record.</h2>
      <p className="case-dek">Six questions every product has to answer, answered for a fashion journal that starts from sound.</p>
    </header>

    <ol className="case-grid">
      <li className="case-cell">
        <span className="case-num" aria-hidden>01</span>
        <h3 className="case-label">Target user</h3>
        <p className="case-lead">The listener who dresses to the record.</p>
        <p>Eighteen to thirty-four and music-first: they build outfits around an artist, an era or a single song, keep moodboards on Tumblr and Pinterest, and find both their music and their style on TikTok and Spotify.</p>
      </li>
      <li className="case-cell">
        <span className="case-num" aria-hidden>02</span>
        <h3 className="case-label">Pain point</h3>
        <p className="case-lead">The song and the look live in different apps.</p>
        <p>You hear a track, picture the outfit, then lose an evening across streaming, search and shopping tabs piecing together who wore what. Most of what turns up is guesswork with no source behind it.</p>
      </li>
      <li className="case-cell">
        <span className="case-num" aria-hidden>03</span>
        <h3 className="case-label">Gap in the market</h3>
        <p className="case-lead">Music apps don't talk about clothes. Fashion apps don't listen.</p>
        <p>Nobody indexes the places a song and a look actually met, on a runway, in a video or on stage, with the evidence attached. The link between them is real, and it's scattered.</p>
      </li>
      <li className="case-cell case-cell--solution">
        <span className="case-num" aria-hidden>04</span>
        <h3 className="case-label">Solution</h3>
        <p className="case-lead">A fashion journal you search by sound.</p>
        <ul className="case-steps">
          <li><strong>Hear it.</strong> Start from an artist, a song or a genre.</li>
          <li><strong>Find the evidence.</strong> Stylist AI reads real articles and runway reports, and cites them.</li>
          <li><strong>Make it yours.</strong> The quiz sets your taste, The Want List keeps the pieces, Styling Notes shares the look.</li>
        </ul>
      </li>
      <li className="case-cell case-cell--tools">
        <span className="case-num" aria-hidden>05</span>
        <h3 className="case-label">AI tools used</h3>
        <ul className="case-tools">
          {tools.map(t => <li key={t.name}><span className="case-tool">{t.name}</span>{" "}<span className="case-tool-use">{t.use}</span></li>)}
        </ul>
      </li>
      <li className="case-cell case-cell--metrics">
        <span className="case-num" aria-hidden>06</span>
        <h3 className="case-label">Success metrics</h3>
        <p className="case-lead">What we track.</p>
        <ul className="case-metrics">
          {metrics.map(m => <li key={m.label}><span className="case-metric">{m.label}</span>{" "}<span className="case-metric-note">{m.note}</span></li>)}
        </ul>
      </li>
    </ol>
  </section>;
}
