import { describe, expect, it } from 'vitest';
import { farfetchLink, formatPrice, pieceKeyword, readFarfetchSearch } from './farfetch';

// Shape of a live farfetch-data search.php response (trimmed).
const images = (id: number) => [54, 250, 400, 800].map(size => ({ order: 1, size: String(size), url: `https://cdn-images.farfetch-contents.com/${id}_${size}.jpg` }));
const entry = (id: number, overrides: Record<string, unknown> = {}) => ({
  id, shortDescription: 'patch-detail bomber jacket', brand: { id: 1205035, name: 'Off-White' },
  price: 5180, currencyIsoCode: 'USD', images: images(id), ...overrides,
});
const payload = (entries: unknown[]) => ({ products: { number: 1, totalPages: 1, totalItems: entries.length, entries }, facets: [] });

describe('Farfetch products', () => {
  it('maps entries into product cards with a 400px image and a Farfetch link', () => {
    expect(readFarfetchSearch(payload([entry(1)]), 'Off-White')).toEqual([{
      id: '1', brand: 'Off-White', name: 'patch-detail bomber jacket', price: 5180, currency: 'USD',
      image: 'https://cdn-images.farfetch-contents.com/1_400.jpg',
      link: 'https://www.farfetch.com/shopping/search/items.aspx?q=Off-White%20patch-detail%20bomber%20jacket',
    }]);
  });

  it('keeps only the requested house, however the tracker spells it', () => {
    const result = readFarfetchSearch(payload([entry(1, { brand: { name: 'Dolce & Gabbana' } }), entry(2)]), 'Off White');
    expect(result.map(product => product.id)).toEqual(['2']);
  });

  it('skips unpriced, unpictured or unnamed entries and stops at the limit', () => {
    const result = readFarfetchSearch(payload([
      entry(1, { price: 0 }), entry(2, { images: [] }), entry(3, { shortDescription: '' }),
      entry(4), entry(5), entry(6), entry(7),
    ]), 'Off-White');
    expect(result.map(product => product.id)).toEqual(['4', '5', '6']);
  });

  it('tolerates empty or unexpected payloads', () => {
    expect(readFarfetchSearch(null, 'Off-White')).toEqual([]);
    expect(readFarfetchSearch({ products: null }, 'Off-White')).toEqual([]);
  });

  it('turns style-note pieces into search keywords', () => {
    expect(pieceKeyword('Crystal-encrusted biker jacket')).toBe('jacket');
    expect(pieceKeyword('Layered metallic choker stack')).toBe('choker');
    expect(pieceKeyword('High-top roller skates')).toBe('skates');
  });

  it('formats prices and builds links', () => {
    expect(formatPrice(5180, 'USD')).toBe('$5,180');
    expect(farfetchLink('Off-White', 'Arrows tee')).toContain('q=Off-White%20Arrows%20tee');
  });
});
