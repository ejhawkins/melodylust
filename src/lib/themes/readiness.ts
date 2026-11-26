// The loader's progress comes from real readiness, not a timer. Each step is a promise with a weight; the bar
// shows the weighted share that has settled. A step that fails still settles (the room falls back), so the
// loader never hangs.
//
// Steps: content (the theme's setlist resolved against the catalog, and the page's assets loaded), fonts, and
// the Spotify player, but only when the listening room is on AND its code has registered a readiness source.
// The listening room (PR #12) calls registerPlayerReadiness with its SDK "ready" signal; until then the step
// is skipped rather than waited on forever.

import { songCatalog, type Song } from '../song-recommendations';
import type { RoomTheme } from './theme-spec';

export type ReadinessStep = { id: 'content' | 'fonts' | 'player'; weight: number; ready: Promise<unknown> };

/** Calls onProgress (0-100) as steps settle; returns a stop function for unmounting. */
export function trackReadiness(steps: ReadinessStep[], onProgress: (percent: number) => void) {
  const total = steps.reduce((sum, step) => sum + step.weight, 0);
  let done = 0;
  let stopped = false;
  onProgress(total ? 0 : 100);
  for (const step of steps) {
    step.ready.catch(() => undefined).then(() => {
      if (stopped) return;
      done += step.weight;
      onProgress(Math.round((done / total) * 100));
    });
  }
  return () => { stopped = true; };
}

let playerReadiness: (() => Promise<unknown>) | null = null;
/** For the listening room's player: resolve when the Web Playback SDK reports "ready". */
export function registerPlayerReadiness(source: (() => Promise<unknown>) | null) { playerReadiness = source; }

/** The theme's four songs, in slot order, from the hand-written catalog. Never from Spotify. */
export function resolveSetlist(theme: RoomTheme): { slot: RoomTheme['setlist'][number]['slot']; why: string; song: Song }[] {
  return theme.setlist.flatMap(entry => {
    const song = songCatalog.find(candidate => `${candidate.title}|${candidate.artist}` === entry.catalogKey);
    return song ? [{ slot: entry.slot, why: entry.why, song }] : [];
  });
}

const pageLoaded = (doc: Document) => doc.readyState === 'complete'
  ? Promise.resolve()
  : new Promise<void>(resolve => doc.defaultView?.addEventListener('load', () => resolve(), { once: true }) ?? resolve());

export function roomReadinessSteps({ theme, roomOn, doc = document, timeoutMs = 8000 }: { theme: RoomTheme; roomOn: boolean; doc?: Document; timeoutMs?: number }): ReadinessStep[] {
  // A step that never settles (a stalled font, a player that never connects) counts as done after the timeout.
  const capped = (promise: Promise<unknown>) => Promise.race([promise, new Promise(resolve => setTimeout(resolve, timeoutMs))]);
  const steps: ReadinessStep[] = [
    { id: 'content', weight: 2, ready: capped(Promise.all([Promise.resolve(resolveSetlist(theme)), pageLoaded(doc)])) },
    { id: 'fonts', weight: 1, ready: capped(doc.fonts?.ready ?? Promise.resolve()) },
  ];
  if (roomOn && playerReadiness) steps.push({ id: 'player', weight: 2, ready: capped(playerReadiness()) });
  return steps;
}
