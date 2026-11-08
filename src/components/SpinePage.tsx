import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SpineSection = 'runway-songs' | 'radio';

// Mobile shows these left to right along the bottom; desktop stands them up as spines, Radio first.
// A hidden section keeps its page but leaves the nav; on desktop its spine stays as an empty column.
const SECTIONS: { id: SpineSection; label: string; href: string; column: string; hidden?: boolean }[] = [
  { id: 'runway-songs', label: 'Runway Songs', href: '/runway-songs', column: 'xl:col-[6]' },
  { id: 'radio', label: 'Radio', href: '/radio', column: 'xl:col-[5]', hidden: true }, // until its stations play something
];

/** Hairline between the panel's cells. */
export const rule = 'border-stylus-paper/70';
// A desktop spine's left hairline, from under the wordmark's row (so it never runs through the letters) to just short
// of the panel's foot.
const spineLine = 'absolute bottom-2.5 left-0 top-[168px] hidden w-px bg-stylus-paper/70 xl:block';

/**
 * The listening room: an ink panel on the ground colour with the wordmark on top and a spine per section.
 * On desktop the panel is a fixed grid (columns at 372, 464, 549 and 952px) that pages place their cells into;
 * below it every cell stacks.
 */
export function SpinePage({ active, children }: { active: SpineSection; children: ReactNode }) {
  return <div className="spine-page min-h-dvh bg-stylus-ground px-3 pb-3 pt-10 font-grotesk text-stylus-paper xl:grid xl:place-items-center xl:py-[84px]">
    <main className="relative mx-auto flex min-h-[calc(100dvh-52px)] max-w-[480px] flex-col bg-stylus-ink xl:mx-0 xl:grid xl:h-[956px] xl:min-h-0 xl:w-full xl:max-w-[1256px] xl:grid-cols-[372px_92px_85px_minmax(0,1fr)_140px_164px] xl:grid-rows-[168px_138px_130px_minmax(0,1fr)]">
      {/* On desktop the wordmark centres on the whole panel; the rule under it stops where the spines begin. */}
      <div aria-hidden="true" className={cn('hidden border-b xl:col-[1/5] xl:row-[1] xl:block', rule)} />
      <div className={cn('flex h-24 shrink-0 items-center justify-center border-b xl:col-[1/-1] xl:row-[1] xl:h-auto xl:border-b-0', rule)}>
        <Wordmark />
      </div>
      {children}
      {SECTIONS.filter(section => section.hidden).map(section => <div key={section.id} aria-hidden="true" className={cn('relative hidden xl:block xl:row-[1/-1]', section.column)}>
        <span className={spineLine} />
      </div>)}
      <nav aria-label="Sections" className={cn('grid h-[72px] shrink-0 auto-cols-fr grid-flow-col divide-x divide-stylus-paper/70 border-t xl:contents xl:divide-x-0', rule)}>
        {SECTIONS.filter(section => !section.hidden).map(section => {
          const current = section.id === active;
          return <a key={section.id} href={section.href} aria-current={current ? 'page' : undefined}
            className={cn('group relative flex items-center justify-center whitespace-nowrap text-[clamp(16px,5.1vw,20px)] font-semibold tracking-[-0.01em] text-stylus-paper font-stretch-125% focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-stylus-paper xl:row-[1/-1] xl:flex-col xl:justify-end xl:pb-[104px] xl:text-[78px] xl:leading-none', section.column)}>
            <span aria-hidden="true" className={spineLine} />
            <span className="transition-opacity duration-200 group-hover:opacity-70 xl:rotate-180 xl:[writing-mode:vertical-rl]">{section.label}</span>
          </a>;
        })}
      </nav>
    </main>
  </div>;
}

/** Tight-tracked and centred in its box; on desktop it's set at 265px and lifted 105px so it rises out of the panel. */
function Wordmark() {
  return <h1 className="m-0 whitespace-nowrap font-editorial text-[clamp(40px,14.5vw,64px)] font-normal leading-[0.8] tracking-[-0.1945em] xl:-mt-[105px] xl:text-[265px] xl:tracking-[-44px]">
    Runway Songs
  </h1>;
}
