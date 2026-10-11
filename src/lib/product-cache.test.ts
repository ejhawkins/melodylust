import { describe, expect, it } from 'vitest';
import { isFresh, productCacheKey, pruneCache, PRODUCT_CACHE_TTL_MS, readCacheFile } from './product-cache';

const product = { id: '1', brand: 'Off-White', name: 'bomber jacket', price: 5180, currency: 'USD', image: 'https://cdn.example/1.jpg', link: 'https://www.farfetch.com/x' };
const HOUR = 60 * 60 * 1000;

describe('product cache', () => {
  it('treats the same house and item as one search, however they are written', () => {
    expect(productCacheKey('Off White', 'Jacket', 1)).toBe(productCacheKey('off-white', 'jacket', 1));
    expect(productCacheKey('Off-White', undefined, 3)).not.toBe(productCacheKey('Off-White', 'jacket', 3));
  });

  it('trusts a saved search for one day', () => {
    const now = 1_000 * HOUR;
    expect(isFresh({ savedAt: now - 23 * HOUR, products: [product] }, now)).toBe(true);
    expect(isFresh({ savedAt: now - 25 * HOUR, products: [product] }, now)).toBe(false);
    expect(isFresh(undefined, now)).toBe(false);
    // A clock that went backwards never makes an entry look fresh forever.
    expect(isFresh({ savedAt: now + HOUR, products: [] }, now)).toBe(false);
    expect(PRODUCT_CACHE_TTL_MS).toBe(24 * HOUR);
  });

  it('drops stale entries when saving', () => {
    const now = 1_000 * HOUR;
    const pruned = pruneCache({ fresh: { savedAt: now - HOUR, products: [product] }, stale: { savedAt: now - 48 * HOUR, products: [product] } }, now);
    expect(Object.keys(pruned)).toEqual(['fresh']);
  });

  it('reads a damaged file as empty instead of failing', () => {
    expect(readCacheFile('not json')).toEqual({});
    expect(readCacheFile('[]')).toEqual({});
    expect(readCacheFile(JSON.stringify({ good: { savedAt: 1, products: [product] }, bad: { products: 'nope' } }))).toEqual({ good: { savedAt: 1, products: [product] } });
  });
});
