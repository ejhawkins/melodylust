import { describe, expect, it } from 'vitest';
import { SWIPE_MIN, swipeStep, trackCounter, upNext } from './featured-playlist';

describe('featured playlist', () => {
  it('counts the selected song against the whole playlist', () => {
    expect(trackCounter(0, 9)).toBe('01 / 09');
    expect(trackCounter(11, 12)).toBe('12 / 12');
  });

  it('names the next song and wraps from the last to the first', () => {
    const songs = ['a', 'b', 'c'];
    expect(upNext(songs, 0)).toBe('b');
    expect(upNext(songs, 2)).toBe('a');
  });

  it('has nothing up next in a one-song or empty playlist', () => {
    expect(upNext(['a'], 0)).toBeNull();
    expect(upNext([], 0)).toBeNull();
  });

  it('reads a leftward drag as next and a rightward drag as previous', () => {
    expect(swipeStep(-SWIPE_MIN, 0)).toBe(1);
    expect(swipeStep(SWIPE_MIN + 20, 10)).toBe(-1);
  });

  it('ignores taps and vertical scrolls', () => {
    expect(swipeStep(SWIPE_MIN - 1, 0)).toBe(0);
    expect(swipeStep(-60, 90)).toBe(0);
    expect(swipeStep(0, 0)).toBe(0);
  });
});
