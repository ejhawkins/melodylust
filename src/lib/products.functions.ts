import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { brandMatches, readFarfetchSearch, type CatalogProduct, type ShopProduct } from './farfetch';
import { productCacheKey } from './product-cache';
import { CATALOG_SEARCHES, mergeCatalogue, readCatalogueFixture, readCatalogueSearch } from './shop-catalogue';

// Each search costs RapidAPI quota. Two layers keep that down:
// 1. `inFlight` (memory): visitors asking for the same search at the same moment share one request.
// 2. The product cache file (disk): finished searches are reused for a day, across restarts.
const inFlight = new Map<string, Promise<ShopProduct[] | null>>();
let requestsThisRun = 0;
let catalogCache: { savedAt: number; products: CatalogProduct[] } | undefined;
let catalogInFlight: Promise<CatalogProduct[]> | undefined;

async function search(apiKey: string, designer: string | undefined, item: string | undefined, limit: number, brand?: string) {
  const keyword = [designer ?? brand, item].filter(Boolean).join(' ');
  // For a house, highest price first surfaces signature pieces rather than phone cases and charms.
  // Across all brands (an article's garment) that just picks the priciest loose match, so keep
  // Farfetch's own order there and rank by how well names match the item instead.
  // A brand an article names is treated like a house: its keyword search otherwise drifts to sportswear.
  const params = new URLSearchParams({ keyword, page: '1', ...(designer || brand ? { sort: 'high_to_low' } : {}), country: 'US', currency: 'USD' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`https://farfetch-data.p.rapidapi.com/search.php?${params}`, {
      headers: { 'x-rapidapi-host': 'farfetch-data.p.rapidapi.com', 'x-rapidapi-key': apiKey },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Farfetch search returned ${response.status}`);
    // A brand from an article keeps every label that carries its name, so read wider before filtering.
    if (brand) return readFarfetchSearch(await response.json(), null, 40, item).filter(product => brandMatches(product.brand, brand)).slice(0, limit);
    return readFarfetchSearch(await response.json(), designer ?? null, limit, item);
  } finally { clearTimeout(timer); }
}

async function searchCatalog(apiKey: string): Promise<CatalogProduct[]> {
  const responses = await Promise.all(CATALOG_SEARCHES.map(async search => {
    const params = new URLSearchParams({ keyword: search.keyword, page: '1', country: 'US', currency: 'USD' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`https://farfetch-data.p.rapidapi.com/search.php?${params}`, {
        headers: { 'x-rapidapi-host': 'farfetch-data.p.rapidapi.com', 'x-rapidapi-key': apiKey }, signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Farfetch catalogue search returned ${response.status}`);
      return readCatalogueSearch(await response.json(), search);
    } finally { clearTimeout(timer); }
  }));
  return mergeCatalogue(responses);
}

/** Current Farfetch products for the home Shop. Missing credentials never fall back to invented rows.
 *  `test` (?products=test on the page) reads the saved Farfetch file instead, for checking the Shop while the
 *  feed is down. Only the dev server honours it: production builds drop the branch and the file with it. */
export const lookupShopCatalog = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => z.object({ test: z.boolean().optional() }).strict().optional().parse(input))
  .handler(async ({ data }): Promise<{ products: CatalogProduct[]; error: string; source: 'live' | 'test' }> => {
    if (import.meta.env.DEV && data?.test) {
      const { default: text } = await import('./fixtures/farfetch-catalogue.json?raw');
      return { products: readCatalogueFixture(JSON.parse(text)), error: '', source: 'test' };
    }
    const apiKey = process.env['RAPIDAPI_KEY'];
    if (!apiKey) return { products: [], error: 'The live Farfetch catalogue is not connected yet.', source: 'live' };
    try {
      if (catalogCache && Date.now() - catalogCache.savedAt < 30 * 60 * 1000) return { products: catalogCache.products, error: '', source: 'live' };
      catalogInFlight ??= searchCatalog(apiKey).then(products => {
        catalogCache = { savedAt: Date.now(), products };
        return products;
      }).finally(() => { catalogInFlight = undefined; });
      return { products: await catalogInFlight, error: '', source: 'live' };
    } catch (failure) {
      console.error('[Products] Farfetch catalogue failed', failure instanceof Error ? failure.message : failure);
      return { products: [], error: 'Live products are unavailable right now. Please try again soon.', source: 'live' };
    }
  });

/** Real products for a look: the house's signature pieces, or one item type from the style notes. */
export const lookupProducts = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({
    // Without a designer, the item (a garment from an article) is searched across all brands.
    designer: z.string().trim().min(1).max(120).optional(),
    item: z.string().trim().min(1).max(60).regex(/^[a-z][a-z -]*$/).optional(),
    // A brand an article names for one outfit piece ("Ralph Lauren" + "polo shirt"); always with an item.
    brand: z.string().trim().min(1).max(60).optional(),
    // Up to CANDIDATE_POOL (8): an outfit piece fetches a few candidates and the page picks one per artist.
    limit: z.number().int().min(1).max(8).default(3),
  }).strict().refine(data => data.designer || data.item, 'A designer or an item is required.')
    .refine(data => !data.brand || (data.item && !data.designer), 'A brand needs an item and no designer.').parse(input))
  // status tells the page why a list is empty: no key, provider down, or simply no match.
  .handler(async ({ data }): Promise<{ products: ShopProduct[]; status: 'ok' | 'not_configured' | 'unavailable' }> => {
    const apiKey = process.env['RAPIDAPI_KEY'];
    const debug = process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1';
    // No key yet: looks simply show no products.
    if (!apiKey) return { products: [], status: 'not_configured' };
    const key = productCacheKey(data.designer ?? (data.brand ? `brand ${data.brand}` : 'any-brand'), data.item, data.limit);
    const { readSavedProducts, saveProducts } = await import('./product-cache.server');
    const saved = await readSavedProducts(key);
    if (saved) {
      if (debug) console.info('[Products] from cache', key);
      return { products: saved, status: 'ok' };
    }
    if (!inFlight.has(key)) {
      inFlight.set(key, (async () => {
        requestsThisRun += 1;
        if (debug) console.info('[Products] Farfetch request', key, `(${requestsThisRun} this run)`);
        const products = await search(apiKey, data.designer, data.item, data.limit, data.brand);
        // Only successful answers are saved; a failure is retried on the next visit.
        await saveProducts(key, products);
        return products;
      })().catch(failure => {
        // Server log only: never the key.
        console.error('[Products] Farfetch search failed', failure instanceof Error ? failure.message : failure);
        return null;
      }).finally(() => inFlight.delete(key)));
    }
    const request = inFlight.get(key);
    const products = request ? await request : null;
    return products ? { products, status: 'ok' } : { products: [], status: 'unavailable' };
  });
