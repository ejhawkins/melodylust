import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readFarfetchSearch, type ShopProduct } from './farfetch';

// Each search costs RapidAPI quota, so a house + item is fetched once per server run.
const cache = new Map<string, Promise<ShopProduct[]>>();

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
    const id = `${data.designer}|${data.item ?? ''}|${data.limit}`.toLowerCase();
    if (!cache.has(id)) {
      cache.set(id, search(apiKey, data.designer, data.item, data.limit).catch(failure => {
        // Server log only: never the key. Failed searches aren't cached, so they retry later.
        console.error('[Products] Farfetch search failed', failure instanceof Error ? failure.message : failure);
        cache.delete(id);
        return [];
      }));
    }
    return { products: await cache.get(id)! };
  });
