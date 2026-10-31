import { useState } from 'react';
import { Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rule, SpinePage } from '@/components/SpinePage';
import { dialPosition, RADIO_STATIONS } from '@/lib/radio-stations';
import { cn } from '@/lib/utils';

const pad = (n: number) => String(n).padStart(2, '0');
const pill = 'inline-flex h-[22px] items-center gap-1.5 rounded-full border border-stylus-paper px-[9px] text-[10px] font-semibold tracking-[0.16em] xl:h-6 xl:gap-[7px] xl:px-2.5';
const icon = 'size-11 p-0 [&_svg]:size-[22px] xl:[&_svg]:size-6';
const about = [
  'Radio is Melody Lust without the runway. Each station is a scene – one sound, one city, one year – and the uniform it put on the street long before anyone sold it back.',
  'Tune in and just listen. The clothes come with the record: what was worn, why it was worn, and how it moved on the dance floor.',
];

/** Radio: a dial of subculture stations, each with the uniform its scene wore. */
export function Radio() {
  const [station, setStation] = useState(1);
  const [onAir, setOnAir] = useState(false);
  const count = RADIO_STATIONS.length;
  const tuned = RADIO_STATIONS[station]!;

  return <SpinePage active="radio">
    <div className={cn('flex h-[66px] shrink-0 items-end border-b px-[14px] pb-2.5 xl:col-[1/5] xl:row-[2] xl:h-auto xl:items-center xl:pb-0 xl:pl-[30px] xl:pr-5', rule)}>
      <h2 className="whitespace-nowrap text-[clamp(28px,9.5vw,37px)] font-semibold leading-none tracking-[-0.02em] font-stretch-125% xl:text-[102px]">{tuned.name}</h2>
    </div>
    <div className={cn('flex h-[60px] shrink-0 items-center justify-end border-b px-[14px] xl:col-[1/5] xl:row-[3] xl:h-auto xl:px-5', rule)}>
      <p className="whitespace-nowrap text-[clamp(32px,10.8vw,42px)] font-semibold leading-none tracking-[-0.02em] font-stretch-125% xl:text-[100px]">{tuned.place}</p>
    </div>

    <section aria-labelledby="radio-uniform" className="flex shrink-0 flex-col xl:col-[1/3] xl:row-[4]">
      <div className={cn('border-b px-[14px] pb-3 pt-4 xl:border-b-0 xl:p-0', rule)}>
        <h3 id="radio-uniform" className={cn('text-[22px] font-bold leading-none tracking-[-0.01em] font-stretch-125% xl:h-[127px] xl:border-b xl:px-8 xl:pt-[22px] xl:text-[50px] xl:leading-[0.86]', rule)}>THE <br className="hidden xl:inline" />UNIFORM</h3>
        <ul className="m-0 mt-2.5 list-none p-0 xl:mt-0 xl:px-8 xl:pt-2.5">
          {tuned.uniform.map((item, k) => <li key={item} className="flex h-10 items-center gap-4 border-t border-stylus-paper/35 xl:h-[38px] xl:gap-5 xl:border-b xl:border-t-0">
            <span className="w-5 shrink-0 text-[10px] font-medium tracking-[0.16em] text-stylus-paper/70 xl:w-[22px] xl:text-[11px]">{pad(k + 1)}</span>
            <span className="text-[17px] font-semibold tracking-[-0.005em] font-stretch-115% xl:text-[22px]">{item}</span>
          </li>)}
        </ul>
      </div>
      <div className={cn('hidden flex-col gap-3 border-b pb-3.5 pl-[27px] pr-8 pt-4 xl:flex', rule)}>
        {about.map(paragraph => <p key={paragraph} className="text-[15px] font-medium leading-[0.95] tracking-[-0.005em] font-stretch-125%">{paragraph}</p>)}
      </div>
    </section>

    <section aria-label="Tuner" className="relative flex flex-1 flex-col justify-center px-4 py-6 xl:col-[3/5] xl:row-[4] xl:justify-start xl:pb-0 xl:pl-[55px] xl:pr-14 xl:pt-8">
      <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-[11px] hidden w-px bg-stylus-paper/70 xl:block" />
      <div className="flex h-[22px] items-center justify-between xl:h-6">
        <p className="text-[11px] font-medium tracking-[0.2em] text-stylus-paper/70 xl:text-xs">STATION {pad(station + 1)} / {pad(count)}</p>
        {onAir
          ? <span className={cn(pill, 'bg-stylus-paper text-stylus-ink')}><span aria-hidden="true" className="size-1.5 rounded-full bg-stylus-accent" />ON AIR</span>
          : <span className={pill}>OFF AIR</span>}
      </div>

      <ul className="m-0 mt-3.5 hidden list-none border-t border-stylus-paper/35 p-0 xl:block">
        {RADIO_STATIONS.map((option, k) => <li key={option.name} className="border-b border-stylus-paper/35">
          <Button variant="tunerStation" aria-pressed={k === station} onClick={() => setStation(k)}
            className="group grid h-11 w-full grid-cols-[34px_minmax(0,1fr)_auto] justify-items-start gap-0 px-3 py-0 text-left">
            <span className="text-[11px] font-medium tracking-[0.16em] text-stylus-paper/70 group-aria-pressed:text-stylus-ink">{pad(k + 1)}</span>
            <span className="text-[17px] font-semibold tracking-[-0.005em] font-stretch-115%">{option.name}</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-stylus-paper/70 group-aria-pressed:text-stylus-ink">{option.place}</span>
          </Button>
        </li>)}
      </ul>

      <div className="relative mt-4 h-[66px] xl:mt-[22px] xl:h-[46px]">
        <div aria-hidden="true" className="radio-scale absolute inset-x-0 top-0 h-3" />
        {RADIO_STATIONS.map((option, k) => {
          const selected = k === station;
          return <div key={option.name}>
            <div aria-hidden="true" className={cn('absolute top-0 h-[18px] w-px xl:h-5', selected ? 'bg-stylus-paper' : 'bg-stylus-paper/70')} style={{ left: dialPosition(k) }} />
            <span aria-hidden="true" className={cn('absolute top-7 hidden -translate-x-1/2 text-[10px] font-medium tracking-[0.14em] xl:block', selected ? 'text-stylus-paper' : 'text-stylus-paper/70')} style={{ left: dialPosition(k) }}>{pad(k + 1)}</span>
            <Button variant="player" aria-label={`Tune to ${option.name}`} aria-pressed={selected} onClick={() => setStation(k)} className="absolute top-5 -ml-[22px] size-11 p-0 xl:hidden" style={{ left: dialPosition(k) }}>
              <span className={cn('flex size-7 items-center justify-center rounded-full text-[11px] font-semibold tracking-[0.04em]', selected ? 'bg-stylus-paper text-stylus-ink' : 'text-stylus-paper/70')}>{pad(k + 1)}</span>
            </Button>
          </div>;
        })}
        <div aria-hidden="true" className="absolute -top-1.5 -ml-px h-[26px] w-0.5 bg-stylus-accent transition-[left] duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] xl:h-[30px]" style={{ left: dialPosition(station) }} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-9 xl:mt-3.5 xl:gap-11">
        <Button variant="player" className={icon} aria-label="Previous station" onClick={() => setStation((station + count - 1) % count)}><SkipBack strokeWidth={1.4} aria-hidden="true" /></Button>
        <Button variant="playerPlay" className="size-[76px] p-0 [&_svg]:size-[26px] xl:size-20 xl:[&_svg]:size-7" aria-label={onAir ? 'Stop' : 'Tune in'} onClick={() => setOnAir(on => !on)}>
          {onAir ? <Square strokeWidth={1.3} className="size-[22px]! xl:size-6!" aria-hidden="true" /> : <Play strokeWidth={1.3} className="ml-[3px] xl:ml-1" aria-hidden="true" />}
        </Button>
        <Button variant="player" className={icon} aria-label="Next station" onClick={() => setStation((station + 1) % count)}><SkipForward strokeWidth={1.4} aria-hidden="true" /></Button>
      </div>
    </section>
  </SpinePage>;
}
