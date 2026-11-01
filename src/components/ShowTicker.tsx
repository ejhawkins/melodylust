import { tickerItems, type ShowNotes } from '@/lib/show-notes';
import { cn } from '@/lib/utils';
import { rule } from './SpinePage';

/**
 * AI show notes running past as a ticker: across the foot of the panel on phones, and up the empty spine column on
 * desktop, read bottom to top like the spines. The moving text is decorative; the same notes, with their sources,
 * are listed for screen readers. Hover pauses it, and reduced motion holds it still.
 */
export function ShowTicker({ notes, show }: { notes: ShowNotes | null; show: string }) {
  if (!notes) return null;
  const items = tickerItems(notes);
  const length = items.reduce((total, item) => total + item.label.length + item.text.length, 0);
  const run = (copy: number) => items.map(item => <span key={`${copy}-${item.label}`} className="flex items-baseline gap-3 pr-8 xl:gap-4 xl:pr-0 xl:pb-12">
    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-stylus-paper/70 xl:text-xs">{item.label}</span>
    <span>{item.text}</span>
  </span>);

  return <section aria-label={`Show notes, ${show}`} className={cn('show-ticker relative h-11 shrink-0 overflow-hidden border-t xl:z-10 xl:col-[5] xl:row-[2/-1] xl:h-auto xl:border-t-0', rule)}>
    <dl className="sr-only">
      {items.filter(item => item.label !== 'AI notes').map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}
      <div><dt>Written by AI (Gemini) from</dt><dd><ul>{notes.sources.map(source => <li key={source.url}><a href={source.url}>{source.title ?? source.url}</a></li>)}</ul></dd></div>
    </dl>
    <div aria-hidden="true" className="absolute inset-0 flex items-center xl:rotate-180 xl:items-start xl:justify-center">
      <div className="show-ticker-track flex w-max whitespace-nowrap text-sm font-semibold tracking-[-0.005em] font-stretch-115% xl:h-max xl:w-auto xl:text-[26px] xl:leading-none xl:tracking-[-0.01em] xl:[writing-mode:vertical-rl]"
        style={{ animationDuration: `${Math.max(40, Math.round(length * 0.3))}s` }}>
        {run(0)}{run(1)}
      </div>
    </div>
  </section>;
}
