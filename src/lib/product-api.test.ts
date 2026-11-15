import { describe, expect, it } from 'vitest';
import { apiIndex, callerKey, catalogAnswer, jsonResponse, productAnswer, readProductQuery } from './product-api';

const query = (text: string) => readProductQuery(new URLSearchParams(text));
const shoe = { id: '1', brand: 'Prada', name: 'Loafers', price: 950, currency: 'USD', image: 'https://img.example/1.jpg', link: 'https://www.farfetch.com/x' };

describe('product API: reading the query', () => {
  it('reads a designer, an item and a limit, with three as the default', () => {
    expect(query('designer=Prada')).toEqual({ ok: true, query: { designer: 'Prada', limit: 3 } });
    expect(query('designer=Prada&item=Loafers&limit=5')).toEqual({ ok: true, query: { designer: 'Prada', item: 'loafers', limit: 5 } });
    expect(query('brand=Ralph%20Lauren&item=polo%20shirt&designer=')).toEqual({ ok: true, query: { brand: 'Ralph Lauren', item: 'polo shirt', limit: 3 } });
  });

  it('says plainly what is wrong with a request', () => {
    expect(query('')).toEqual({ ok: false, error: 'Give a designer or an item.' });
    expect(query('brand=Gucci')).toEqual({ ok: false, error: 'Give a designer or an item.' });
    expect(query('brand=Gucci&item=bag&designer=Prada')).toEqual({ ok: false, error: 'brand needs an item and no designer.' });
    expect(query('item=bag&limit=50')).toMatchObject({ ok: false, error: expect.stringContaining('limit') });
    expect(query('item=<script>')).toMatchObject({ ok: false, error: expect.stringContaining('letters') });
    expect(query('item=bag&colour=red')).toEqual({ ok: false, error: 'Unknown parameter: colour.' });
  });
});

describe('product API: shaping the answer', () => {
  it('returns products with a count, and an empty list is still a 200', () => {
    expect(productAnswer({ designer: 'Prada', limit: 3 }, { products: [shoe], status: 'ok' })).toEqual({
      status: 200, body: { version: 1, source: 'farfetch', query: { designer: 'Prada', limit: 3 }, count: 1, products: [shoe] },
    });
    expect(productAnswer({ item: 'kilt', limit: 3 }, { products: [], status: 'ok' })).toMatchObject({ status: 200, body: { count: 0, products: [] } });
  });

  it('reports a missing key or a failed feed as an error, never as invented products', () => {
    expect(productAnswer({ item: 'kilt', limit: 3 }, { products: [], status: 'not_configured' })).toMatchObject({ status: 503, body: { error: expect.any(String) } });
    const down = productAnswer({ item: 'kilt', limit: 3 }, { products: [], status: 'unavailable' });
    expect(down.status).toBe(502);
    expect(down.body).not.toHaveProperty('products');
  });

  it('lists the catalogue with its categories, or passes its error on', () => {
    const piece = { ...shoe, category: 'Shoes', sizes: ['40'], images: [], availability: 'in_stock' as const, tags: [], description: '' };
    expect(catalogAnswer({ products: [piece, { ...piece, id: '2', category: 'Bags' }], error: '' })).toMatchObject({ status: 200, body: { count: 2, categories: ['Shoes', 'Bags'] } });
    expect(catalogAnswer({ products: [], error: 'Not connected.' })).toEqual({ status: 503, body: { version: 1, source: 'farfetch', error: 'Not connected.' } });
  });
});

describe('product API: responses', () => {
  it('is open JSON, cached only when it succeeded', async () => {
    const ok = jsonResponse({ a: 1 }, 200, 3600);
    expect(ok.headers.get('access-control-allow-origin')).toBe('*');
    expect(ok.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(await ok.json()).toEqual({ a: 1 });
    expect(jsonResponse({ error: 'x' }, 502, 3600).headers.get('cache-control')).toBe('no-store');
  });

  it('keys the rate limit on the caller’s address', () => {
    expect(callerKey(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(callerKey(new Headers())).toBe('unknown');
  });

  it('documents its endpoints with working example addresses', () => {
    const index = apiIndex('https://www.melodylust.fashion');
    expect(index.endpoints.map(endpoint => endpoint.path)).toEqual(['/api/products', '/api/catalog']);
    for (const example of index.endpoints[0]!.examples) expect(query(new URL(example).search.slice(1)).ok).toBe(true);
  });
});
