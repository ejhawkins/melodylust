import { useEffect, useRef, useState } from 'react';
import { ArrowDown, X } from 'lucide-react';
import { onWishAdded, useWishlist, type WishAdded } from '@/lib/wishlist';

const SHOW_MS = 8000;
const pad = (n: number) => String(n).padStart(2, '0');

/** A live Want List card that slides up whenever a piece or song is saved anywhere on the page.
 *  It stays hidden while the Want List section itself is on screen, and holds while hovered or focused. */
export function WantListPop() {
  const items = useWishlist();
  const [last, setLast] = useState<WishAdded | null>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const listOnScreen = useRef(false);
  const held = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const scheduleClose = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { if (!held.current) setOpen(false); }, SHOW_MS);
  };

  useEffect(() => {
    const list = document.getElementById('wishlist');
    if (!list || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => { listOnScreen.current = Boolean(entry?.isIntersecting); }, { threshold: .15 });
    io.observe(list);
    return () => io.disconnect();
  }, []);

  useEffect(() => onWishAdded(event => {
    const what = event.item.kind === 'song' ? 'playlist' : 'Want List';
    setAnnouncement(event.duplicate ? `${event.item.name} is already on your ${what}.` : `${event.item.name} added to your ${what}.`);
    if (listOnScreen.current) return;
    setLast(event);
    setOpen(true);
    scheduleClose();
  }), []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pieces = items.filter(item => item.kind === 'piece');
  const songs = items.filter(item => item.kind === 'song');
  const latest = [...items].reverse().slice(0, 3);
  const hold = (on: boolean) => { held.current = on; if (!on) scheduleClose(); };

  return <>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {open && last && <aside className="want-pop" aria-label="The Want List"
      onMouseEnter={() => hold(true)} onMouseLeave={() => hold(false)} onFocus={() => hold(true)} onBlur={() => hold(false)}>
      <div className="want-pop-head">
        <span className="want-pop-kicker">{last.duplicate ? 'Already on your list' : last.item.kind === 'song' ? 'Added to your playlist' : 'Added to The Want List'}</span>
        <button type="button" className="want-pop-close" aria-label="Close the Want List card" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
      </div>
      <p className="want-pop-name">{last.item.name}</p>
      {last.item.detail && <p className="want-pop-detail">{last.item.detail}</p>}
      <div className="want-pop-counts"><span>Pieces <b>{pad(pieces.length)}</b></span><span>Saved tracks <b>{pad(songs.length)}</b></span></div>
      <ol className="want-pop-latest" aria-label="Latest saves">
        {latest.map(item => <li key={item.id} data-new={item.id === last.item.id}><span>{item.kind === 'song' ? 'Track' : 'Piece'}</span>{item.name}</li>)}
      </ol>
      <button type="button" className="want-pop-open" onClick={() => { setOpen(false); document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' }); }}>
        Open the Want List <ArrowDown aria-hidden="true" />
      </button>
    </aside>}
  </>;
}
