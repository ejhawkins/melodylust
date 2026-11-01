import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Pause, Play, Plus, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DesignerPortrait } from '@/components/DesignerPortrait';
import { ShowTicker } from '@/components/ShowTicker';
import { rule, SpinePage } from '@/components/SpinePage';
import { resolveSampler } from '@/lib/runway-sampler';
import { useSamplerEdits } from '@/lib/runway-sampler-store';
import { withArchive } from '@/lib/runway-archive';
import { CATEGORY_LABELS, clock, hiddenTracks, nextIndex, previousIndex, RESTART_AFTER_MS, runwaySongs, textWidthEm, titleStep, type RunwaySong } from '@/lib/runway-songs';
import { useSavedSongs } from '@/lib/runway-songs-store';
import { showKey, type ShowNotes } from '@/lib/show-notes';
import { useSpotifyEmbed } from '@/lib/spotify-embed';
import { cn } from '@/lib/utils';

const eyebrow = 'text-[11px] font-medium tracking-[0.2em] text-stylus-paper/70 xl:text-xs';
const pill = 'inline-flex h-[22px] items-center rounded-full border border-stylus-paper px-[9px] text-[10px] font-semibold uppercase tracking-[0.16em] xl:h-6 xl:px-2.5';
const icon = 'relative size-11 p-0 [&_svg]:size-[22px] xl:[&_svg]:size-6';
// One class per TITLE_STEPS entry: mobile size, then desktop.
const titleSizes = ['text-[48px] xl:text-[84px]', 'text-[40px] xl:text-[68px]', 'text-[34px] xl:text-[56px]', 'text-[28px] xl:text-[46px]'];
// Five looks fill the strip edge to edge; the copy behind them only shows while it runs.
const looks = Array.from({ length: 5 }, (_, index) => `LOOK ${String(index + 1).padStart(2, '0')}`);
const lookCard = 'flex size-full flex-col items-center justify-end gap-1 rounded-[10px] bg-stylus-paper/10 pb-2 text-[10px] font-medium tracking-[0.16em] text-stylus-paper/70';
const noArchive: RunwaySong[] = [];
const noNotes: Record<string, ShowNotes> = {};
const manifesto = [
  'Every styling app solves the same problem: what should I buy. They measure you, match you, optimize you, and hand back a grid of products with nothing behind it. Nothing you’d save. Nothing you’d feel. Just fit.',
  'Music has been fashion’s muse for sixty years – every subculture worth naming got its uniform from a sound. Melody Lust puts that back in the machine. We start with what you listen to, because it’s the only data about you that’s actually about you.',
];

/** Runway Songs: the sampler's sourced show soundtracks and the archive's, one at a time, played through Spotify, with AI notes on each show. */
export function RunwaySongs({ archive = noArchive, showNotes = noNotes }: { archive?: RunwaySong[]; showNotes?: Record<string, ShowNotes> }) {
  const [edits] = useSamplerEdits();
  const songs = useMemo(() => {
    const rows = resolveSampler(edits);
    return withArchive(runwaySongs(rows), archive, hiddenTracks(rows));
  }, [edits, archive]);
  const [index, setIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [saved, toggleSaved] = useSavedSongs();
  const current = Math.min(index, Math.max(songs.length - 1, 0));
  const song = songs[current] ?? null;
  const embed = useSpotifyEmbed(song?.spotifyUri ?? null, () => {
    if (repeat) embed.restart(true);
    else setIndex(nextIndex(current, songs.length, shuffle));
  });
  const { paused, positionMs, durationMs, stalled, failed } = embed.playback;
  const progress = `${durationMs ? Math.min(positionMs / durationMs, 1) * 100 : 0}%`;
  const isSaved = song ? saved.includes(song.id) : false;
  // The portrait leaves the house 252px at 50px; a wider one (Balenciaga) sets in a narrower cut, about 0.6 as wide.
  const longHouse = song ? textWidthEm(song.house) * 50 > 252 : false;

  const togglePlay = () => {
    if (!embed.toggle() && failed && song) window.open(song.spotifyUrl, '_blank', 'noopener,noreferrer');
  };
  const previous = () => {
    if (positionMs > RESTART_AFTER_MS) embed.restart();
    else setIndex(previousIndex(current, songs.length));
  };

  if (!song) return <SpinePage active="runway-songs">
    <section aria-label="Now playing" className="flex flex-1 flex-col justify-center gap-4 px-4 py-10 xl:col-[1/5] xl:row-[2/-1] xl:px-8">
      <h2 className="text-[37px] font-semibold leading-none tracking-[-0.02em] font-stretch-125% xl:text-[64px]">Nothing to play</h2>
      <p className="max-w-md text-base">Every sourced track is hidden in your running order. <a href="/runway-sampler" className="underline underline-offset-2 hover:text-white">Show them in the Runway Sound Sampler</a>.</p>
    </section>
  </SpinePage>;

  return <SpinePage active="runway-songs">
    <div className={cn('flex h-[66px] shrink-0 items-end border-b px-[14px] pb-2.5 xl:col-[1/5] xl:row-[2] xl:h-auto xl:items-center xl:pb-0 xl:pl-[30px] xl:pr-5', rule)}>
      <h2 className="whitespace-nowrap text-[clamp(28px,9.5vw,37px)] font-semibold leading-none tracking-[-0.02em] font-stretch-125% xl:text-[102px]">{song.season}</h2>
    </div>

    <section aria-label="Runway looks" className={cn('runway-looks relative hidden border-b xl:col-[1/4] xl:row-[3] xl:block', rule)}>
      <ul className="runway-looks-track absolute left-[26px] top-2.5 m-0 flex list-none p-0">
        {[...looks, ...looks].map((look, position) => {
          const copy = position >= looks.length;
          const href = song.looks[position % looks.length];
          return <li key={position} aria-hidden={copy || undefined} className="runway-look relative mr-[22px] h-[107px] w-[82px] shrink-0">
            {href
              ? <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={copy ? -1 : undefined} className={cn(lookCard, 'hover:text-stylus-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stylus-paper')}>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />{look}<span className="sr-only"> of {song.house} {song.season} {song.year} on Tagwalk</span>
              </a>
              : <div className={lookCard}>{look}</div>}
          </li>;
        })}
      </ul>
    </section>

    <div className={cn('flex h-[60px] shrink-0 items-center justify-end border-b px-[14px] xl:col-[4] xl:row-[3] xl:h-auto xl:border-l xl:px-5', rule)}>
      <p className="whitespace-nowrap text-[clamp(34px,11.3vw,44px)] font-semibold leading-none tracking-[-0.02em] font-stretch-125% xl:text-[104px]">{song.year}’</p>
    </div>

    <div className="flex shrink-0 flex-col xl:col-[1/3] xl:row-[4]">
      <div className={cn('flex h-[140px] items-start justify-between gap-3 border-b px-[14px] py-4 xl:h-[127px] xl:px-8 xl:pb-0 xl:pt-[22px]', rule)}>
        <h3 className={cn(longHouse ? 'text-[24px] font-stretch-75% xl:text-[44px]' : 'text-[27px] font-stretch-125% xl:text-[50px]', 'font-bold uppercase leading-[0.88] tracking-[-0.01em] xl:leading-[0.86]')}>{song.house}</h3>
        <DesignerPortrait key={song.id} designers={song.designers} house={song.house}
          className="size-[108px] shrink-0 xl:absolute xl:left-[296px] xl:top-[356px] xl:z-10 xl:size-[220px]" />
      </div>
      <section aria-label="About Melody Lust" className={cn('hidden flex-col gap-3.5 border-b pb-[18px] pl-[27px] pr-8 pt-11 xl:flex', rule)}>
        {manifesto.map(paragraph => <p key={paragraph} className="text-base font-medium leading-[0.92] tracking-[-0.005em] font-stretch-125%">{paragraph}</p>)}
      </section>
    </div>

    <section aria-label="Now playing" className="relative flex flex-1 flex-col px-4 pb-4 pt-5 xl:col-[3/5] xl:row-[4] xl:pb-0 xl:pl-[55px] xl:pr-14 xl:pt-[62px]">
      <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-[150px] hidden w-px bg-stylus-paper/70 xl:block" />
      <div className="flex h-[22px] items-center justify-between xl:h-6">
        <p className={eyebrow}>NOW PLAYING / {String(current + 1).padStart(2, '0')}</p>
        <span className={pill}>{song.category} · {CATEGORY_LABELS[song.category]}</span>
      </div>

      <h4 className={cn(titleSizes[titleStep(song.name)], 'mt-4 font-extrabold uppercase leading-[0.9] tracking-[-0.02em] font-stretch-125% xl:mt-[22px]')}>{song.name}</h4>
      {song.version && <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stylus-paper/70 xl:text-xs">{song.version}</p>}

      <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
        <p className="min-w-0 text-lg font-semibold leading-tight tracking-[-0.005em] font-stretch-115% xl:text-[22px]">
          <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stylus-paper">
            {song.artist}<span className="sr-only"> (open this track on Spotify)</span>
          </a>
        </p>
        <Button variant="player" className={cn(icon, '-mr-3 [&_svg]:size-5 xl:[&_svg]:size-[22px]')} aria-label={isSaved ? 'Remove from saved' : 'Save track'} aria-pressed={isSaved} onClick={() => toggleSaved(song.id)}>
          {isSaved ? <Check strokeWidth={1.4} aria-hidden="true" /> : <Plus strokeWidth={1.4} aria-hidden="true" />}
        </Button>
      </div>

      {/* The drawn bar stays as it was; a transparent range input over it takes clicks, drags and arrow keys. */}
      <div className="group/seek relative mt-2 h-3.5 xl:mt-3">
        <div aria-hidden="true" className="absolute inset-x-0 top-1.5 h-px bg-stylus-paper/45" />
        <div aria-hidden="true" className="absolute left-0 top-1.5 h-px bg-stylus-paper" style={{ width: progress }} />
        <div aria-hidden="true" className="absolute top-[3px] -ml-[3px] size-[7px] rounded-full bg-stylus-paper transition-transform group-hover/seek:scale-150 group-has-[:focus-visible]/seek:scale-150" style={{ left: progress }} />
        <input type="range" aria-label="Seek" min={0} max={durationMs || 0} step={1000} value={Math.min(positionMs, durationMs || 0)} disabled={!durationMs}
          aria-valuetext={`${clock(positionMs)} of ${clock(durationMs)}`} onChange={event => embed.seek(Number(event.target.value))}
          className="absolute -inset-y-2 inset-x-0 m-0 w-full cursor-pointer appearance-none opacity-0 disabled:cursor-default" />
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-medium tabular-nums tracking-[0.14em] text-stylus-paper/70 xl:mt-2 xl:text-[13px]">
        <span>{clock(positionMs)}</span>
        <span>{durationMs ? clock(durationMs) : '–:––'}</span>
      </div>

      <div className="mt-3 flex items-center justify-between xl:mt-3.5">
        <Button variant="player" className={icon} aria-label="Shuffle" aria-pressed={shuffle} onClick={() => setShuffle(on => !on)}>
          <Shuffle strokeWidth={1.4} aria-hidden="true" />
          {shuffle && <span aria-hidden="true" className="absolute bottom-0.5 left-5 size-1 rounded-full bg-stylus-paper" />}
        </Button>
        <Button variant="player" className={icon} aria-label="Previous" onClick={previous}><SkipBack strokeWidth={1.4} aria-hidden="true" /></Button>
        <Button variant="playerPlay" className="size-[76px] p-0 [&_svg]:size-[26px] xl:size-[92px] xl:[&_svg]:size-[30px]" aria-label={paused ? 'Play' : 'Pause'} onClick={togglePlay}>
          {paused ? <Play strokeWidth={1.3} className="ml-[3px] xl:ml-1" aria-hidden="true" /> : <Pause strokeWidth={1.3} aria-hidden="true" />}
        </Button>
        <Button variant="player" className={icon} aria-label="Next" onClick={() => setIndex(nextIndex(current, songs.length, shuffle))}><SkipForward strokeWidth={1.4} aria-hidden="true" /></Button>
        <Button variant="player" className={icon} aria-label="Repeat" aria-pressed={repeat} onClick={() => setRepeat(on => !on)}>
          <Repeat strokeWidth={1.4} aria-hidden="true" />
          {repeat && <span aria-hidden="true" className="absolute bottom-0.5 left-5 size-1 rounded-full bg-stylus-paper" />}
        </Button>
      </div>

      <p role="status" className="mt-2 text-xs text-stylus-paper/80 empty:hidden">
        {(stalled || failed) && <>{failed ? 'The Spotify player didn’t load. ' : 'Spotify didn’t start the track here. '}
          <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">Play it on Spotify</a></>}
      </p>
      {/* The embed that makes the sound; the controls above drive it. */}
      <div ref={embed.host} aria-hidden="true" inert className="pointer-events-none absolute size-px overflow-hidden opacity-0" />
    </section>

    <ShowTicker key={showKey(song)} notes={showNotes[showKey(song)] ?? null} show={`${song.house} ${song.season} ${song.year}`} />
  </SpinePage>;
}
