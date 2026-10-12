import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readFarfetchCatalog, readFarfetchSearch, type CatalogProduct, type ShopProduct } from './farfetch';
import { productCacheKey } from './product-cache';

// Each search costs RapidAPI quota. Two layers keep that down:
// 1. `inFlight` (memory): visitors asking for the same search at the same moment share one request.
// 2. The product cache file (disk): finished searches are reused for a day, across restarts.
const inFlight = new Map<string, Promise<ShopProduct[]>>();
let requestsThisRun = 0;
let catalogCache: { savedAt: number; products: CatalogProduct[] } | undefined;
let catalogInFlight: Promise<CatalogProduct[]> | undefined;

async function search(apiKey: string, designer: string | undefined, item: string | undefined, limit: number) {
  const keyword = [designer, item].filter(Boolean).join(' ');
  // For a house, highest price first surfaces signature pieces rather than phone cases and charms.
  // Across all brands (an article's garment) that just picks the priciest loose match, so keep
  // Farfetch's own order there and rank by how well names match the item instead.
  const params = new URLSearchParams({ keyword, page: '1', ...(designer ? { sort: 'high_to_low' } : {}), country: 'US', currency: 'USD' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`https://farfetch-data.p.rapidapi.com/search.php?${params}`, {
      headers: { 'x-rapidapi-host': 'farfetch-data.p.rapidapi.com', 'x-rapidapi-key': apiKey },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Farfetch search returned ${response.status}`);
    return readFarfetchSearch(await response.json(), designer ?? null, limit, item);
  } finally { clearTimeout(timer); }
}

const CATALOG_SEARCHES = [
  { keyword: 'cardigan women', category: 'Knitwear', names: ['cardigan'] },
  { keyword: 'mini skirt women', category: 'Skirts', names: ['skirt'] },
  { keyword: 'jacket women', category: 'Outerwear', names: ['jacket', 'coat', 'blazer'] },
  { keyword: 'slip dress women', category: 'Dresses', names: ['dress', 'gown'] },
  { keyword: 'top women', category: 'Tops', names: ['top', 'shirt', 'blouse', 'vest'] },
  { keyword: 'shoulder bag women', category: 'Bags', names: ['bag', 'tote'] },
] as const;

async function searchCatalog(apiKey: string): Promise<CatalogProduct[]> {
  const responses = await Promise.all(CATALOG_SEARCHES.map(async ({ keyword, category, names }) => {
    const params = new URLSearchParams({ keyword, page: '1', country: 'US', currency: 'USD' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`https://farfetch-data.p.rapidapi.com/search.php?${params}`, {
        headers: { 'x-rapidapi-host': 'farfetch-data.p.rapidapi.com', 'x-rapidapi-key': apiKey }, signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Farfetch catalogue search returned ${response.status}`);
      return readFarfetchCatalog(await response.json(), category, 30)
        .filter(product => names.some(name => product.name.toLowerCase().includes(name)))
        .slice(0, 3);
    } finally { clearTimeout(timer); }
  }));
  return responses.flat().filter((product, index, all) => all.findIndex(other => other.id === product.id) === index);
}

/** Current Farfetch products for the home Shop. Missing credentials never fall back to invented rows. */
export const lookupShopCatalog = createServerFn({ method: 'GET' })
  .handler(async (): Promise<{ products: CatalogProduct[]; error: string }> => {
    const apiKey = process.env['RAPIDAPI_KEY'];
    if (!apiKey) return { products: [], error: 'The live Farfetch catalogue is not connected yet.' };
    try {
      if (catalogCache && Date.now() - catalogCache.savedAt < 30 * 60 * 1000) return { products: catalogCache.products, error: '' };
      catalogInFlight ??= searchCatalog(apiKey).then(products => {
        catalogCache = { savedAt: Date.now(), products };
        return products;
      }).finally(() => { catalogInFlight = undefined; });
      return { products: await catalogInFlight, error: '' };
    } catch (failure) {
      console.error('[Products] Farfetch catalogue failed', failure instanceof Error ? failure.message : failure);
      return { products: [], error: 'Live products are unavailable right now. Please try again soon.' };
    }
  });

/** Real products for a look: the house's signature pieces, or one item type from the style notes. */
export const lookupProducts = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({
    // Without a designer, the item (a garment from an article) is searched across all brands.
    designer: z.string().trim().min(1).max(120).optional(),
    item: z.string().trim().min(1).max(60).regex(/^[a-z][a-z -]*$/).optional(),
    limit: z.number().int().min(1).max(6).default(3),
  }).strict().refine(data => data.designer || data.item, 'A designer or an item is required.').parse(input))
  .handler(async ({ data }): Promise<{ products: ShopProduct[] }> => {
    const apiKey = process.env['RAPIDAPI_KEY'];
    const debug = process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1';
    // No key yet: looks simply show no products.
    if (!apiKey) return { products: [] };
    const key = productCacheKey(data.designer ?? 'any-brand', data.item, data.limit);
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
    const request = inFlight.get(key);
    return { products: request ? await request : [] };
  });
