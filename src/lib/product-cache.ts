// Rules for the product cache: which saved Farfetch results are still fresh enough to
// show instead of spending another RapidAPI request. Pure, so it is tested without a disk.

import type { ShopProduct } from './farfetch';

/** Prices and stock move, so a saved search is trusted for one day. */
export const PRODUCT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type CachedSearch = { savedAt: number; products: ShopProduct[] };
export type CacheFile = Record<string, CachedSearch>;

/** "Off White" + "Jacket" and "off-white" + "jacket" are the same search. */
export const productCacheKey = (designer: string, item: string | undefined, limit: number) =>
  `${designer.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}|${item?.trim().toLowerCase() ?? ''}|${limit}`;

export const isFresh = (entry: CachedSearch | undefined, now: number, ttl = PRODUCT_CACHE_TTL_MS): entry is CachedSearch =>
  Boolean(entry) && now - entry!.savedAt >= 0 && now - entry!.savedAt < ttl;

/** Keeps only fresh entries, so the file never grows with stale searches. */
export const pruneCache = (file: CacheFile, now: number, ttl = PRODUCT_CACHE_TTL_MS): CacheFile =>
  Object.fromEntries(Object.entries(file).filter(([, entry]) => isFresh(entry, now, ttl)));

/** A damaged or hand-edited file is treated as empty rather than crashing the site. */
export function readCacheFile(text: string): CacheFile {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) =>
      entry && typeof entry === 'object' && typeof (entry as CachedSearch).savedAt === 'number' && Array.isArray((entry as CachedSearch).products)));
  } catch { return {}; }
}
