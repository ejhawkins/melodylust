import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readFarfetchSearch, type ShopProduct } from './farfetch';
import { productCacheKey } from './product-cache';

// Each search costs RapidAPI quota. Two layers keep that down:
// 1. `inFlight` (memory): visitors asking for the same search at the same moment share one request.
// 2. The product cache file (disk): finished searches are reused for a day, across restarts.
const inFlight = new Map<string, Promise<ShopProduct[]>>();
let requestsThisRun = 0;
const debug = process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1';

async function search(apiKey: string, designer: string, item: string | undefined, limit: number) {
  const keyword = item ? `${designer} ${item}` : designer;
  // Highest price first surfaces signature pieces rather than phone cases and charms.
  const params = new URLSearchParams({ keyword, page: '1', sort: 'high_to_low', country: 'US', currency: 'USD' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`https://farfetch-data.p.rapidapi.com/search.php?${params}`, {
      headers: { 'x-rapidapi-host': 'farfetch-data.p.rapidapi.com', 'x-rapidapi-key': apiKey },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Farfetch search returned ${response.status}`);
    return readFarfetchSearch(await response.json(), designer, limit);
  } finally { clearTimeout(timer); }
}

/** Real products for a look: the house's signature pieces, or one item type from the style notes. */
export const lookupProducts = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({
    designer: z.string().trim().min(1).max(120),
    item: z.string().trim().min(1).max(40).regex(/^[a-z-]+$/).optional(),
    limit: z.number().int().min(1).max(6).default(3),
  }).strict().parse(input))
  .handler(async ({ data }): Promise<{ products: ShopProduct[] }> => {
    const apiKey = process.env['RAPIDAPI_KEY'];
    // No key yet: looks simply show no products.
    if (!apiKey) return { products: [] };
    const key = productCacheKey(data.designer, data.item, data.limit);
    const { readSavedProducts, saveProducts } = await import('./product-cache.server');
    const saved = await readSavedProducts(key);
    if (saved) {
      if (debug) console.info('[Products] from cache', key);
      return { products: saved };
    }
    if (!inFlight.has(key)) {
      inFlight.set(key, (async () => {
        requestsThisRun += 1;
        if (debug) console.info('[Products] Farfetch request', key, `(${requestsThisRun} this run)`);
        const products = await search(apiKey, data.designer, data.item, data.limit);
        // Only successful answers are saved; a failure is retried on the next visit.
        await saveProducts(key, products);
        return products;
      })().catch(failure => {
        // Server log only: never the key.
        console.error('[Products] Farfetch search failed', failure instanceof Error ? failure.message : failure);
        return [];
      }).finally(() => inFlight.delete(key)));
    }
    return { products: await inFlight.get(key)! };
  });
