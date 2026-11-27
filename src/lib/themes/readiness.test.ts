import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPlayerReadiness, resolveSetlist, roomReadinessSteps, trackReadiness, type ReadinessStep } from './readiness';
import { ROOM_THEMES } from './theme-spec';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred() { let resolve!: () => void, reject!: (e: unknown) => void; const promise = new Promise<void>((y, n) => { resolve = y; reject = n; }); return { promise, resolve, reject }; }

describe('loader progress from real readiness', () => {
  afterEach(() => registerPlayerReadiness(null));

  it('moves by each settled step’s weight, not on a timer', async () => {
    const content = deferred(), fonts = deferred(), player = deferred();
    const steps: ReadinessStep[] = [{ id: 'content', weight: 2, ready: content.promise }, { id: 'fonts', weight: 1, ready: fonts.promise }, { id: 'player', weight: 2, ready: player.promise }];
    const seen: number[] = [];
    trackReadiness(steps, p => seen.push(p));
    await flush();
    expect(seen).toEqual([0]);
    fonts.resolve(); await flush();
    content.resolve(); await flush();
    expect(seen.at(-1)).toBe(60);
    player.reject(new Error('SDK failed')); await flush(); // a failed step still settles: the room falls back
    expect(seen.at(-1)).toBe(100);
  });

  it('stops reporting after unmount', async () => {
    const step = deferred();
    const onProgress = vi.fn();
    const stop = trackReadiness([{ id: 'fonts', weight: 1, ready: step.promise }], onProgress);
    stop(); step.resolve(); await flush();
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('waits for the Spotify player only when the room is on and the player has registered', () => {
    const theme = ROOM_THEMES['hiphop-runway'];
    expect(roomReadinessSteps({ theme, roomOn: true }).map(s => s.id)).toEqual(['content', 'fonts']);
    registerPlayerReadiness(() => new Promise(() => {}));
    expect(roomReadinessSteps({ theme, roomOn: false }).map(s => s.id)).toEqual(['content', 'fonts']);
    expect(roomReadinessSteps({ theme, roomOn: true }).map(s => s.id)).toEqual(['content', 'fonts', 'player']);
  });

  it('never hangs on a step that does not settle', async () => {
    vi.useFakeTimers();
    registerPlayerReadiness(() => new Promise(() => {}));
    const seen: number[] = [];
    trackReadiness(roomReadinessSteps({ theme: ROOM_THEMES['autumn-tartan'], roomOn: true, timeoutMs: 50 }), p => seen.push(p));
    await vi.advanceTimersByTimeAsync(60);
    expect(seen.at(-1)).toBe(100);
    vi.useRealTimers();
  });

  it('resolves each theme’s setlist from the catalog, in slot order', () => {
    for (const theme of Object.values(ROOM_THEMES)) {
      const setlist = resolveSetlist(theme);
      expect(setlist.map(entry => entry.slot)).toEqual(['opener', 'walk-out', 'mid', 'closer']);
      expect(setlist.map(entry => `${entry.song.title}|${entry.song.artist}`)).toEqual(theme.setlist.map(entry => entry.catalogKey));
    }
  });
});
