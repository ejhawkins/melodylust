// The Shop the Song sheet's small sums, kept apart from the component so they can be tested without a browser.
import type { WishItem } from './wishlist';

/** "Fashion Week — Wale" as its title and artist; a caption without the dash is all title. */
export function splitCaption(caption: string): { title: string; artist: string } {
  const at = caption.lastIndexOf(' — ');
  return at < 0 ? { title: caption.trim(), artist: '' } : { title: caption.slice(0, at).trim(), artist: caption.slice(at + 3).trim() };
}

/** Whether a song's piece is already on the Want List, matched the way addWish matches it: kind, name and song. */
export function inEdit(items: readonly WishItem[], song: string, name: string): boolean {
  return items.some(i => i.kind === 'piece' && i.name === name && i.from === song);
}

/** "No. 01": a garment's place in the edit, for cards whose look names no fashion house. */
export const editNumber = (index: number) => `No. ${String(index + 1).padStart(2, '0')}`;
