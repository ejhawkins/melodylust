// The Featured tab's small sums, kept apart from the component so they can be tested without a browser.
import { step } from './listening-room';

/** "03 / 12": the selected song's place in the playlist, both padded to two digits. */
export const trackCounter = (index: number, total: number) =>
  `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

/** The song after `index`, wrapping round; null when the playlist has nothing else to play. */
export function upNext<T>(songs: readonly T[], index: number): T | null {
  return songs.length > 1 ? songs[step(songs.length, index, 1)] ?? null : null;
}

/** How far a finger must travel sideways before a drag counts as a swipe. */
export const SWIPE_MIN = 40;

/** A drag read as a swipe: 1 for the next song (finger moves left), -1 for the previous, 0 when it was a tap or a
 *  vertical scroll. */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}
