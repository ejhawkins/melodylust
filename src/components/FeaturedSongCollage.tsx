import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ShoppingBag, Music2, Activity, ListPlus, Check, ChevronsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FeaturedSong = { image: string; alt: string; caption: string; link: string };
type Props = { songs: FeaturedSong[]; onShop: (song: string) => void; onSave?: (song: FeaturedSong) => void };
const samples = [
  { bpm: 130, key: 'A minor', genre: 'Hip-house', duration: '3:42', release: '2008', reels: '24.8K', views: '8.2M', engagement: '6.4%' },
  { bpm: 128, key: 'F minor', genre: 'Dance pop', duration: '2:58', release: '2025', reels: '18.3K', views: '4.6M', engagement: '8.1%' },
  { bpm: 104, key: 'C minor', genre: 'Hip-hop', duration: '2:36', release: '2025', reels: '12.6K', views: '3.1M', engagement: '5.7%' },
  { bpm: 120, key: 'D minor', genre: 'Pop', duration: '3:08', release: '2025', reels: '32.1K', views: '6.8M', engagement: '9.2%' },
  { bpm: 86, key: 'G minor', genre: 'R&B / Hip-hop', duration: '5:24', release: '2003', reels: '41.5K', views: '12.4M', engagement: '4.9%' },
  { bpm: 110, key: 'B minor', genre: 'Hip-hop', duration: '3:23', release: '2017', reels: '9.7K', views: '2.8M', engagement: '6.8%' },
];

export function FeaturedSongCollage({ songs, onShop, onSave }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = track.current;
      if (!el || media.matches) return;
      const distance = el.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -el.getBoundingClientRect().top / Math.max(1, distance)));
      setFocused(progress > .07);
      setActive(Math.min(songs.length - 1, Math.max(0, Math.floor((progress - .08) / .92 * songs.length))));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const preference = () => { setReduced(media.matches); if (media.matches) setFocused(true); else update(); };
    preference();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    media.addEventListener('change', preference);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll); media.removeEventListener('change', preference); };
  }, [songs.length]);
  const select = (index: number) => {
    setActive(index); setFocused(true);
    const el = track.current;
    if (!el || reduced) return;
    const start = window.scrollY + el.getBoundingClientRect().top;
    window.scrollTo({ top: start + (.08 + (index + .35) / songs.length * .92) * (el.offsetHeight - window.innerHeight), behavior: 'smooth' });
  };
  const [saved, setSaved] = useState<string[]>([]);
  const save = (s: FeaturedSong) => { onSave?.(s); setSaved(v => v.includes(s.caption) ? v : [...v, s.caption]); };
  const skip = () => { const el = track.current; if (!el) return; window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().bottom, behavior: reduced ? 'auto' : 'smooth' }); };
  const song = songs[active];
  if (!song) return null;
  const data = samples[active % samples.length];
  if (!data) return null;
  const [title, artist] = song.caption.split(' — ');
  return <div className="song-collage-track" ref={track} data-reduced={reduced}>
    <div className="song-collage-stage" data-focused={focused}>
      <div className="song-collage-heading"><h2>ON REPEAT.</h2><div className="song-collage-meta"><span>{String(active + 1).padStart(2, '0')} / {String(songs.length).padStart(2, '0')}</span><Button variant="editorial" className="song-collage-skip" onClick={skip}>Skip <ChevronsDown /></Button></div></div>
      <div className="song-collage-covers" aria-label="Select a featured song">
        {songs.map((s, i) => <Button key={s.caption} variant="editorial" className="song-collage-cover" data-active={active === i} aria-pressed={active === i && focused} aria-label={`Feature ${s.caption}`} onClick={() => select(i)}><img src={s.image} alt={s.alt} width={600} height={600} /><span>{s.caption}</span></Button>)}
      </div>
      <div className="song-collage-caption" data-visible={focused}><span>{artist}</span><h3>{title}</h3><div className="song-collage-actions"><Button asChild variant="editorial"><a href={song.link} target="_blank" rel="noreferrer">Listen <ArrowUpRight /></a></Button><Button variant="editorial" onClick={() => onShop(song.caption)}><ShoppingBag /> Shop the look</Button><Button variant="editorial" className="song-collage-want" aria-label={`Add ${song.caption} to Want List`} title="Add to Want List" onClick={() => save(song)}>{saved.includes(song.caption) ? <Check /> : <ListPlus />} {saved.includes(song.caption) ? 'In Want List' : 'Want List'}</Button></div></div>
      <div className="song-collage-data" data-visible={focused}>
        <p className="song-sample-label">Sample data — not live analytics</p>
        <div className="song-bpm"><Activity aria-hidden="true" /><strong>{data.bpm}</strong><span>BPM</span></div>
        <dl className="song-music-data"><div><dt>Key</dt><dd>{data.key}</dd></div><div><dt>Genre</dt><dd>{data.genre}</dd></div><div><dt>Duration</dt><dd>{data.duration}</dd></div><div><dt>Released</dt><dd>{data.release}</dd></div></dl>
        <div className="song-social-heading"><Music2 aria-hidden="true" /><h4>Social pulse</h4><span>Sample · 30 days</span></div>
        <dl className="song-social-data"><div><dt>Reel uses</dt><dd>{data.reels}</dd></div><div><dt>Video views</dt><dd>{data.views}</dd></div><div><dt>Engagement</dt><dd>{data.engagement}</dd></div></dl>
        <svg className="song-trend" viewBox="0 0 400 65" role="img" aria-label="Sample social activity trend, rising over thirty days"><path className="song-trend-rule" d="M0 60H400 M0 30H400" /><path className="song-trend-line" d={`M0 56 L25 49 L50 53 L75 ${43 + active} L100 46 L125 32 L150 38 L175 25 L200 33 L225 ${22 + active} L250 25 L275 13 L300 19 L325 7 L350 13 L375 5 L400 2`} /></svg>
        <div className="song-trend-axis"><span>Day 01</span><span>Day 30</span></div>
      </div>
      <div className="song-collage-index" aria-label="Featured song selection">{songs.map((s, i) => <Button key={s.caption} variant="editorial" aria-label={`Select ${s.caption}`} aria-pressed={active === i} onClick={() => select(i)}>{String(i + 1).padStart(2, '0')}</Button>)}</div>
    </div>
  </div>;
}