// The public product API (/api/products, /api/catalog): Melody Lust's product format over Farfetch, as JSON for other
// apps. This module is the plain half: reading a request's query, shaping the answer and its headers. The routes in
// src/routes/api.*.ts only connect it to the existing product lookups, so everything here is unit-tested without a key.

import { z } from 'zod';
import type { CatalogProduct, ShopProduct } from './farfetch';

export const PRODUCT_API_VERSION = 1;
/** Farfetch (through RapidAPI) is the only source; the name is in every answer so a client can credit it. */
export const PRODUCT_SOURCE = 'farfetch';
export const MAX_PRODUCTS = 8;

const querySchema = z.object({
  designer: z.string().trim().min(1).max(120).optional(),
  // Garment words only, as the lookup expects: "trench coat", "loafers".
  item: z.string().trim().toLowerCase().min(1).max(60).regex(/^[a-z][a-z -]*$/, 'item takes letters, spaces and hyphens only').optional(),
  brand: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PRODUCTS).default(3),
}).strict()
  .refine(query => query.designer || query.item, 'Give a designer or an item.')
  .refine(query => !query.brand || (query.item && !query.designer), 'brand needs an item and no designer.');

export type ProductQuery = z.infer<typeof querySchema>;

/** A request's query string as a product search, or the reason it can't be one. Empty values count as absent. */
export function readProductQuery(params: URLSearchParams): { ok: true; query: ProductQuery } | { ok: false; error: string } {
  const given = Object.fromEntries([...params.entries()].filter(([, value]) => value.trim() !== ''));
  const parsed = querySchema.safeParse(given);
  if (parsed.success) return { ok: true, query: parsed.data };
  const issue = parsed.error.issues[0];
  const unknown = issue?.code === 'unrecognized_keys' ? `Unknown parameter: ${issue.keys.join(', ')}.` : null;
  const field = issue?.path.length ? `${issue.path.join('.')}: ` : '';
  return { ok: false, error: unknown ?? `${field}${issue?.message ?? 'Invalid request.'}` };
}

export type ProductStatus = 'ok' | 'not_configured' | 'unavailable';
const STATUS_CODES: Record<ProductStatus, number> = { ok: 200, not_configured: 503, unavailable: 502 };
const STATUS_ERRORS: Record<Exclude<ProductStatus, 'ok'>, string> = {
  not_configured: 'The product feed is not connected.',
  unavailable: 'The product feed is unavailable right now. Try again soon.',
};

/** The HTTP status and JSON body for a search answer. An empty list with status "ok" simply means no match. */
export function productAnswer(query: ProductQuery, result: { products: ShopProduct[]; status: ProductStatus }) {
  const body = result.status === 'ok'
    ? { version: PRODUCT_API_VERSION, source: PRODUCT_SOURCE, query, count: result.products.length, products: result.products }
    : { version: PRODUCT_API_VERSION, source: PRODUCT_SOURCE, query, error: STATUS_ERRORS[result.status] };
  return { status: STATUS_CODES[result.status], body };
}

/** The same for the shop catalogue, which reports trouble as a sentence rather than a status. */
export function catalogAnswer(result: { products: CatalogProduct[]; error: string }) {
  if (result.error) return { status: result.products.length ? 200 : 503, body: { version: PRODUCT_API_VERSION, source: PRODUCT_SOURCE, error: result.error } };
  const categories = [...new Set(result.products.map(product => product.category))];
  return { status: 200, body: { version: PRODUCT_API_VERSION, source: PRODUCT_SOURCE, count: result.products.length, categories, products: result.products } };
}

/** What /api says: the endpoints and how to call them. */
export function apiIndex(origin: string) {
  return {
    name: 'Melody Lust product API', version: PRODUCT_API_VERSION, source: PRODUCT_SOURCE,
    endpoints: [
      {
        path: '/api/products', method: 'GET', about: 'Search products by designer, garment or brand.',
        parameters: {
          designer: 'A fashion house, e.g. Prada. Returns its signature pieces, or one garment with item.',
          item: 'A garment, e.g. trench coat. On its own it searches every brand.',
          brand: 'A brand an outfit names, e.g. Ralph Lauren. Needs item, and no designer.',
          limit: `1 to ${MAX_PRODUCTS}; 3 if left out.`,
        },
        examples: [`${origin}/api/products?designer=Prada`, `${origin}/api/products?item=trench%20coat&limit=5`, `${origin}/api/products?brand=Ralph%20Lauren&item=polo%20shirt`],
      },
      { path: '/api/catalog', method: 'GET', about: 'The shop catalogue: a current edit across categories, with sizes and availability.', examples: [`${origin}/api/catalog`] },
    ],
    product: { id: 'string', brand: 'string', name: 'string', price: 'number', currency: 'ISO code', image: 'https URL', link: 'Farfetch URL' },
    limits: 'Read-only. A few dozen requests an hour per caller; answers are cached, so repeat the same query freely.',
  };
}

/** Each caller gets this many requests an hour (see rate-limit.ts: in memory, per server instance). */
export const API_RATE = { limit: 60, windowMs: 60 * 60_000 };

/** Who is calling, for the rate limit: the first address a proxy reports, else one shared bucket. */
export const callerKey = (headers: Headers) => headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || 'unknown';

/** JSON for anyone to read (CORS open, GET only). `cacheSeconds` lets the host's cache answer repeats without a new search. */
export function jsonResponse(body: unknown, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'cache-control': status === 200 && cacheSeconds > 0 ? `public, max-age=60, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}` : 'no-store',
    },
  });
}

export const preflight = () => new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-max-age': '86400' } });

/** The API is read-only: every other method is told so, rather than falling through to a page. */
const refuse = () => jsonResponse({ error: 'This API is read-only. Use GET.' }, 405);
export const readOnly = { POST: refuse, PUT: refuse, PATCH: refuse, DELETE: refuse };
