import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MelodyLustEvidence } from './MelodyLustEvidence';
import { lookupArtistPortrait } from '@/lib/artist-portrait.functions';
import type { ArtistPortrait } from '@/lib/artist-portrait';
import { addWish } from '@/lib/wishlist';
import { profileSelectionCount, type StyleProfile } from '@/lib/style-profile';
import pick1 from '@/assets/editorial-pick-1.jpg';
import pick2 from '@/assets/editorial-pick-2.jpg';
import pick3 from '@/assets/editorial-pick-3.jpg';
import pick4 from '@/assets/editorial-pick-4.jpg';
import pick5 from '@/assets/editorial-pick-5.jpg';
import pick6 from '@/assets/editorial-pick-6.jpg';
import kaliImage from '@/assets/kali-album.jpg';
const kali = { url: kaliImage };

const trendPlaceholders = ['Desert intelligence', 'After-hours tailoring', 'Silver on repeat', 'Soft-volume dressing'];

const picks = [
  { name: 'Tiger-print tailoring', image: pick1 }, { name: 'The sculptural heel', image: pick2 },
  { name: 'Vintage suede', image: pick3 }, { name: 'Patent after dark', image: pick4 },
  { name: 'A little silk', image: pick5 }, { name: 'Silver, on repeat', image: pick6 },
];

export function StyleSearch({ profile, onEditProfile }: { profile: StyleProfile; onEditProfile: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const wordmark = useRef<HTMLDivElement>(null);
  const [cursorActive, setCursorActive] = useState(false);
  // The searched artist's free-licence portrait replaces the Kali Uchis cursor while their results show.
  const [portrait, setPortrait] = useState<ArtistPortrait | null>(null);
  const portraitFor = useRef('');
  const showArtist = (name: string | null) => {
    portraitFor.current = name ?? '';
    if (!name) { setPortrait(null); return; }
    lookupArtistPortrait({ data: { name } }).then(({ portrait: found }) => {
      if (portraitFor.current !== name) return; // a newer search took over
      if (!found) { setPortrait(null); return; }
      // Swap only once the photo has loaded, so the cursor never flashes empty.
      const image = new Image();
      image.onload = () => { if (portraitFor.current === name) setPortrait(found); };
      image.src = found.imageUrl;
    }).catch(() => setPortrait(null));
  };
  const [searchFocused, setSearchFocused] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [position, setPosition] = useState(1);
  useEffect(() => {
    const element = wordmark.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const paint = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const offset = motion.matches ? 0 : Math.max(-12, Math.min(12, (window.innerHeight / 2 - bounds.top - bounds.height / 2) * .035));
      element.style.setProperty('--wordmark-parallax', `${offset}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        element.dataset['revealed'] = 'true';
        observer?.disconnect();
      }
    }, { threshold: .3 });
    if (observer && !motion.matches) observer.observe(element);
    else element.dataset['revealed'] = 'true';
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    motion.addEventListener('change', schedule);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motion.removeEventListener('change', schedule);
    };
  }, []);
  const scroll = (direction: number) => {
    const el = track.current;
    const first = el?.firstElementChild;
    if (!el || !first) return;
    const step = first.getBoundingClientRect().width + 12;
    el.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  };

  return <section id="search" className="stylus" aria-label="The Upbeat Stylus" onPointerMove={event => {
    if (event.pointerType !== 'mouse' || searchFocused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setCursorActive(true);
    if (cursor.current) { cursor.current.style.left = `${event.clientX}px`; cursor.current.style.top = `${event.clientY}px`; }
  }} onPointerLeave={() => setCursorActive(false)}>
    <h2 className="stylus-heading">THE UPBEAT STYLUS</h2>
    <div className="stylus-body">
      <div className="flex flex-col items-end gap-3 text-right text-stylus-paper"><span className="text-xs uppercase">{profileSelectionCount(profile) ? `Your style profile · ${profileSelectionCount(profile)} preferences` : 'Your style profile'}</span><Button variant="stylusTool" className="font-editorial stylus-quiz-button" onClick={onEditProfile}><SlidersHorizontal />{profileSelectionCount(profile) ? 'Edit profile' : 'Take the quiz'}</Button></div>
      <div className="mb-7" onFocusCapture={() => { setSearchFocused(true); setCursorActive(false); }} onBlurCapture={() => setSearchFocused(false)}><MelodyLustEvidence profile={profile} onArtist={showArtist} />{portrait && <p className="stylus-cursor-credit">Cursor photo of {portrait.name}: <a href={portrait.sourceUrl} target="_blank" rel="noopener noreferrer">{portrait.author}</a> / Wikimedia Commons, {portrait.licenseUrl ? <a href={portrait.licenseUrl} target="_blank" rel="noopener noreferrer license">{portrait.license}</a> : portrait.license}</p>}</div>
      <div className="stylus-picks-head"><div className="min-w-0"><span className="stylus-eyebrow">The editorial picks</span><p className="stylus-trend">Now trending: <span className="sr-only">Desert intelligence</span><span className="stylus-trend-swipe" aria-hidden="true">{trendPlaceholders.map(phrase => <span key={phrase}>{phrase}</span>)}</span></p></div><div className="stylus-arrows"><span>{position} / 6</span><Button variant="stylusTool" size="icon" aria-label="Previous editorial picks" title="Previous picks" onClick={() => scroll(-1)}><ArrowLeft /></Button><Button variant="stylusTool" size="icon" aria-label="Next editorial picks" title="Next picks" onClick={() => scroll(1)}><ArrowRight /></Button></div></div>
      <div className="stylus-track" ref={track} onScroll={() => {
        const el = track.current;
        const child = el?.firstElementChild;
        if (el && child) setPosition(Math.min(6, Math.round(el.scrollLeft / (child.getBoundingClientRect().width + 12)) + 1));
      }}>{picks.map((pick, i) => <article className="stylus-pick" key={pick.name}><img src={pick.image} alt={pick.name} width={512} height={512} loading="lazy" /><div className="stylus-pick-caption"><span><small>0{i + 1}</small>{pick.name}</span><Button variant="stylusTool" size="icon" aria-label={`Save ${pick.name}`} title="Save to My Edit" onClick={() => { addWish({ kind: 'piece', name: pick.name, detail: 'Editorial inspiration', link: '', note: '', from: 'The Upbeat Stylus' }); setSaved(s => [...s, pick.name]); }}>{saved.includes(pick.name) ? <Check /> : <Plus />}</Button></div></article>)}</div>
      <div className="stylus-scene">
        <div className="stylus-wordmark" ref={wordmark}><div className="stylus-journal-copy"><p className="stylus-journal-title">An independent<br />fashion journal<br /><span>Vol. 01 — Autumn 2026</span></p><p className="stylus-brand-disclaimer">I AM NOT AFFILIATED WITH ANY OF THESE BRANDS. IT IS MEANT FOR INSPIRATION ONLY.</p></div></div>
        <figure className="stylus-album"><img src={kali.url} alt="Kali Uchis — Red Moon in Venus album artwork" width={440} height={440} loading="lazy" /><figcaption>Editor's pick: Kali Uchis<br /><em>Red Moon in Venus</em></figcaption></figure>
      </div>
    </div>
    <div className="stylus-cursor" data-active={cursorActive && !searchFocused} ref={cursor} aria-hidden="true"><img src={portrait?.imageUrl ?? kali.url} alt="" width={440} height={440} /><span>{portrait?.name ?? 'Kali Uchis'}</span></div>
  </section>;
}
