// The product cache's notebook on disk: one JSON file of recent Farfetch searches.
// Locally it lives in .cache/ (git-ignored) and survives restarts. On Vercel only /tmp is
// writable and each server instance has its own, so it helps less there; a shared store
// (e.g. Redis) can replace these two functions without touching the callers.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ShopProduct } from './farfetch';
import { isFresh, pruneCache, readCacheFile, type CacheFile } from './product-cache';

const DIR = process.env['MELODYLUST_CACHE_DIR'] || (process.env['VERCEL'] ? '/tmp/melodylust-cache' : '.cache');
const FILE = join(DIR, 'products.json');

let loaded: Promise<CacheFile> | undefined;
const load = () => (loaded ??= readFile(FILE, 'utf8').then(readCacheFile, (): CacheFile => ({})));

/** Saved products for this search if they are less than a day old. */
export async function readSavedProducts(key: string): Promise<ShopProduct[] | undefined> {
  const entry = (await load())[key];
  return isFresh(entry, Date.now()) ? entry.products : undefined;
}

/** Remembers a search's products for a day. A failed write only costs a future request. */
export async function saveProducts(key: string, products: ShopProduct[]) {
  const now = Date.now();
  const file = pruneCache({ ...(await load()), [key]: { savedAt: now, products } }, now);
  loaded = Promise.resolve(file);
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(file));
  } catch (failure) {
    console.error('[Products] could not write the product cache', failure instanceof Error ? failure.message : failure);
  }
}
