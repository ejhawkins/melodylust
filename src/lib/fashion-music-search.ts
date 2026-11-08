// Fashion & Music Search, the large search the cover menu unveils: products and songs are matched
// here, without any network or browser storage, so the page only gathers sources and shows results.
import { brandMatches, itemMatchScore, type ShopProduct } from './farfetch';

export type SongHit = {
  id: string;
  title: string;
  artist: string;
  /** Where the song comes from: "Hot 100 · No. 4", "Editor's pick", "Your library"… */
  source: string;
  href: string;
  /** Everything a search may match beyond title and artist: album, genres, a designer moment. */
  extra?: string;
};

export type SearchProduct = ShopProduct & { category?: string; description?: string; tags?: string[] };

/** Lower-case words without accents or punctuation, so "Beyoncé" finds "beyonce" and "Off-White" finds "off white". */
export const fold = (value: string) =>
  value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

const words = (query: string) => fold(query).split(' ').filter(Boolean);

/** Every word of the query appears somewhere in the text. An empty query matches nothing. */
export function matches(query: string, text: string) {
  const wanted = words(query);
  if (!wanted.length) return false;
  const haystack = ` ${fold(text)}`;
  return wanted.every(word => haystack.includes(` ${word}`));
}

const songKey = (song: Pick<SongHit, 'title' | 'artist'>) => `${fold(song.title)}|${fold(song.artist).split(' ')[0] ?? ''}`;

/** Songs matching the query, in source order, each song once. */
export function findSongs(songs: readonly SongHit[], query: string, limit = 12): SongHit[] {
  const seen = new Set<string>();
  const found: SongHit[] = [];
  for (const song of songs) {
    if (!matches(query, `${song.title} ${song.artist} ${song.extra ?? ''}`)) continue;
    const key = songKey(song);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(song);
    if (found.length >= limit) break;
  }
  return found;
}

/** Products whose brand, name, category, description or tags carry every word of the query. */
export function findProducts<T extends SearchProduct>(products: readonly T[], query: string, limit = 12): T[] {
  return products
    .filter(p => matches(query, [p.brand, p.name, p.category, p.description, ...(p.tags ?? [])].filter(Boolean).join(' ')))
    .slice(0, limit);
}

/** The query as a live Farfetch item search ("slip dress"), or null when the server would refuse it. */
export function liveItem(query: string): string | null {
  const item = query.toLowerCase().replace(/\s+/g, ' ').trim();
  return item.length >= 3 && item.length <= 60 && /^[a-z][a-z -]*$/.test(item) ? item : null;
}

/** Live results that actually answer the query: a shared garment word, or the brand itself. */
export const relevantLive = (products: readonly ShopProduct[], query: string) =>
  products.filter(p => itemMatchScore(query, p.name) > 0 || brandMatches(p.brand, query));

/** The query names a house ("prada", "off white") when Farfetch's own results carry it as their brand. */
export const namesHouse = (products: readonly ShopProduct[], query: string) => products.some(p => brandMatches(p.brand, query));

/** Catalogue matches first, then live ones, each product once. */
export function mergeProducts<T extends ShopProduct>(first: readonly T[], second: readonly T[], limit = 12): T[] {
  const ids = new Set<string>();
  return [...first, ...second].filter(p => !ids.has(p.id) && Boolean(ids.add(p.id))).slice(0, limit);
}
