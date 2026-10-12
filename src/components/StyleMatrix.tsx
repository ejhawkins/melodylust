import { useLayoutEffect, useRef, useState } from 'react';
import anita from '@/assets/moodboards/IMG_7247.jpg.asset.json';
import mono from '@/assets/moodboards/IMG_7257.jpg.asset.json';
import bright from '@/assets/moodboards/IMG_7253.jpg.asset.json';
import y2k from '@/assets/moodboards/IMG_7250.jpg.asset.json';

export const GENRES = ['Y2K', 'Afrofuturist', 'Quiet Luxury', 'Grunge', 'Soft Glam'] as const;
type Genre = typeof GENRES[number];
type MoodImage = { src: string; alt: string; focus: string; caption?: string };
export type Moodboard = { id: string; title: string; genres: Genre[]; images: MoodImage[]; palette: string[] };

// One statement piece — the faux-fur coat — is the common denominator.
// Every board is a different way to wear it; the look is labelled on the hero image.
export const STATEMENT_PIECE = 'The Statement Coat';
export const moodboards: Moodboard[] = [
  { id: 'rock', title: 'Worn with 70s suede', genres: ['Grunge', 'Quiet Luxury'], palette: ['#b88a5e', '#7a4a2a', '#d9b48a', '#3b2a1e', '#efe3d0'], images: [
    { src: anita.url, alt: 'Anita Pallenberg in a newsboy cap and patchwork coat', focus: '15% 25%', caption: 'Look 01 — thrown over patchwork suede' },
    { src: anita.url, alt: 'Patchwork leather zip jacket in tan and brown', focus: '85% 15%' },
    { src: anita.url, alt: 'Brown suede top-handle bag', focus: '85% 48%' },
    { src: anita.url, alt: 'Blonde fringe and shearling coat portrait', focus: '75% 85%' } ] },
  { id: 'mono', title: 'Worn monochrome', genres: ['Quiet Luxury', 'Afrofuturist'], palette: ['#f2f0ec', '#c9b08a', '#8a8f93', '#3a3a3c', '#4a1e2a'], images: [
    { src: mono.url, alt: 'Masked models in black sculptural dresses', focus: '85% 50%', caption: 'Look 02 — sculptural black underneath' },
    { src: mono.url, alt: 'Pink marbled collar close-up', focus: '75% 5%' },
    { src: mono.url, alt: 'Graphic black and white line top', focus: '10% 45%' },
    { src: mono.url, alt: 'Neutral colour swatch grid', focus: '75% 25%' },
    { src: mono.url, alt: 'Wire-frame lounge chair', focus: '85% 95%' } ] },
  { id: 'bright', title: 'Worn with colour', genres: ['Afrofuturist', 'Soft Glam'], palette: ['#e94b3c', '#a77dd6', '#8aa83a', '#f2b9a8', '#e8c46a'], images: [
    { src: bright.url, alt: 'Model with red balloon and dog on a sand dune', focus: '50% 55%', caption: 'Look 03 — clashed against desert brights' },
    { src: bright.url, alt: 'Ribbed lilac and blue knit top', focus: '10% 10%' },
    { src: bright.url, alt: 'Gold hoop earrings with resin drops', focus: '90% 20%' },
    { src: bright.url, alt: 'Puffy pink platform sandals', focus: '80% 95%' } ] },
  { id: 'y2k', title: 'Worn off-duty', genres: ['Y2K', 'Grunge'], palette: ['#8c1c24', '#d9cfc2', '#2b2522', '#b08a5a', '#e9e4dc'], images: [
    { src: y2k.url, alt: 'Fur coat, red bag and baggy jeans street style', focus: '45% 10%', caption: 'Look 04 — baggy jeans and a red bag' },
    { src: y2k.url, alt: 'Stacked silver bangles', focus: '10% 40%' },
    { src: y2k.url, alt: 'Burgundy leather jacket', focus: '30% 82%' },
    { src: y2k.url, alt: 'White mini dress and boots, black and white', focus: '85% 92%' } ] },
  { id: 'glam', title: 'Worn after dark', genres: ['Soft Glam', 'Y2K'], palette: ['#f1d3d0', '#c48b8e', '#2a1d1f', '#e7d9c9', '#9a5a5f'], images: [
    { src: y2k.url, alt: 'Lace camisole mirror selfie', focus: '50% 95%', caption: 'Look 05 — over lace and kitten heels' },
    { src: y2k.url, alt: 'Red tie-front camisole under leather', focus: '85% 60%' },
    { src: y2k.url, alt: 'Red kitten heels', focus: '45% 45%' } ] },
];

export function StyleMatrix() {
  const [active, setActive] = useState<Genre[]>([]);
  const refs = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());
  const toggle = (g: Genre) => {
    refs.current.forEach((el, id) => prev.current.set(id, el.getBoundingClientRect()));
    setActive(a => (a.includes(g) ? a.filter(x => x !== g) : [...a, g]));
  };
  const clear = () => { refs.current.forEach((el, id) => prev.current.set(id, el.getBoundingClientRect())); setActive([]); };
  const matches = (b: Moodboard) => !active.length || b.genres.some(g => active.includes(g));
  const ordered = [...moodboards].sort((a, b) => Number(matches(b)) - Number(matches(a)));

  // FLIP: animate tiles from their old position after a filter reorders them.
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { prev.current.clear(); return; }
    refs.current.forEach((el, id) => {
      const first = prev.current.get(id);
      if (!first) return;
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left, dy = first.top - last.top;
      if (!dx && !dy) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    });
    prev.current.clear();
  }, [active]);

  return <div className="mood-matrix">
    {ordered.map((b) => {
      const i = moodboards.indexOf(b);
      return <article key={b.id} ref={el => { if (el) refs.current.set(b.id, el); else refs.current.delete(b.id); }} className="mood-tile" data-dim={!matches(b)} style={{ animationDelay: `${i * 60}ms` }}>
        <div className="mood-board" data-count={b.images.length}>
          {b.images.map((img, j) => <div className={j === 0 ? 'mood-img mood-hero' : 'mood-img'} key={j}><img src={img.src} alt={img.alt} loading="lazy" style={{ objectPosition: img.focus }} />{j === 0 && img.caption && <span className="mood-caption">{img.caption}</span>}</div>)}
        </div>
        <div className="mood-palette" aria-label={`${b.title} palette`}>{b.palette.map(c => <span key={c} style={{ background: c }} title={c} />)}</div>
        <h3 className="mood-title">{b.title}</h3>
        <div className="mood-pills" role="group" aria-label="Filter by style genre">
          {GENRES.map(g => <button type="button" key={g} className="mood-pill" aria-pressed={active.includes(g)} data-own={b.genres.includes(g)} onClick={() => toggle(g)}>{g}</button>)}
          <button type="button" className="mood-pill mood-pill-clear" onClick={clear} disabled={!active.length}>Clear</button>
        </div>
      </article>;
    })}
  </div>;
}
