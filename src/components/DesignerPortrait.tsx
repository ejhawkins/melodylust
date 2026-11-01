import { useId, useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { CategoryId } from '@/lib/runway-sampler';
import { genreBeatSeconds, type Designer } from '@/lib/runway-songs';
import { cn } from '@/lib/utils';

// Industrial stamps out of a square like a press, Electro-pulse thumps on the kick, Post-punk twitches through torn
// shapes, and Spatial drifts out of a soft blob with a ring circling it.
const MOTIONS: Record<CategoryId, string> = { A: 'stamp', B: 'pulse', C: 'twitch', D: 'drift' };

/**
 * The show's creative director(s), photographed for Wikipedia, with a caption on hover, keyboard focus or tap
 * (touch screens have no hover). Two photographed directors split the circle; one without
 * a free portrait is named in the caption only.
 *
 * With a genre, the portrait comes in from that genre's shape, settles into the circle and keeps moving the genre's
 * way, in time with the middle of its tempo band (styles.css, "Runway Songs portrait").
 */
export function DesignerPortrait({ designers, house, genre, className }: { designers: Designer[]; house: string; genre?: CategoryId; className?: string }) {
  const [open, setOpen] = useState(false);
  const caption = useId();
  const role = designers.length > 1 ? 'Co-creative directors' : 'Creative director';
  const photographed = designers.flatMap(designer => (designer.photo ? [{ name: designer.name, photo: designer.photo }] : []));
  const beat = genre ? genreBeatSeconds(genre) : null;

  return <div data-open={open} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} className={cn('group relative', className)}>
    <div data-motion={genre && MOTIONS[genre]} style={beat ? { '--beat': `${beat.toFixed(3)}s` } as CSSProperties : undefined} className="portrait-motion relative size-full">
      <button type="button" aria-expanded={open} aria-controls={caption} onClick={() => setOpen(current => !current)}
        aria-label={`${designers.map(designer => designer.name).join(' and ')}, ${role.toLowerCase()} of ${house}`}
        className="flex size-full overflow-hidden rounded-full bg-stylus-paper/10 transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stylus-paper group-hover:scale-105 group-data-[open=true]:scale-105">
        {photographed.map(({ name, photo }) => <img key={name} src={photo.src} alt="" loading="lazy" decoding="async"
          className="h-full min-w-0 flex-1 object-cover object-[50%_25%]" />)}
      </button>
    </div>
    <div id={caption} className="invisible absolute right-0 top-full z-20 w-60 pt-3 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100 group-data-[open=true]:visible group-data-[open=true]:opacity-100 xl:left-1/2 xl:right-auto xl:-translate-x-1/2">
      <div className="border border-stylus-paper/70 bg-stylus-ink p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stylus-paper/70">{role} · {house}</p>
        <ul className="m-0 mt-1.5 list-none p-0">
          {designers.map(designer => <li key={designer.name}>
            <a href={designer.wikipedia} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-base font-semibold tracking-[-0.005em] font-stretch-115% hover:text-white">
              {designer.name}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only"> on Wikipedia</span>
            </a>
          </li>)}
        </ul>
        <p className="mt-1.5 text-[10px] leading-snug text-stylus-paper/70">
          {photographed.flatMap(({ name, photo }) => {
            const credit = [photo.credit, photo.licence].filter(Boolean).join(', ');
            return credit ? [{ name, credit, source: photo.source }] : [];
          }).map(({ name, credit, source }, k) => <span key={name}>{k > 0 && ' · '}Photo{designers.length > 1 && ` (${name.split(' ')[0]})`}: {source
            ? <a href={source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">{credit}</a>
            : credit}</span>)}
        </p>
      </div>
    </div>
  </div>;
}
