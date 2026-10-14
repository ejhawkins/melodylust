import { useEffect, useRef, useState } from 'react';

/** A section heading in the "This is a mood" type: Bodoni capitals built as word groups of letter
 *  spans, revealed letter by letter once in view. `rule` adds the thin line underneath; leave it off
 *  where the next section's own border already sits below the heading. */
export function MoodHeading({ text, className = '', rule = true }: { text: string; className?: string; rule?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: .3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const words = text.toUpperCase().split(/\s+/);
  let index = 0;
  return <div className={`film-head mood-heading ${className}`.trim()} ref={ref} data-inview={inView}>
    <h2 className="film-title mood-heading-title" aria-label={text}>{words.map(word => <span className="film-word" key={word} aria-hidden>
      {word.split('').map((ch, i) => <span key={i} style={{ transitionDelay: `${index++ * 45}ms` }}>{ch}</span>)}
    </span>)}</h2>
    {rule && <span className="film-rule" aria-hidden="true" />}
  </div>;
}
