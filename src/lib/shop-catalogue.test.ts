import { describe, expect, it } from 'vitest';
import fixtureText from './fixtures/farfetch-catalogue.json?raw';
import { CATALOG_SEARCHES, readCatalogueFixture, readCatalogueSearch } from './shop-catalogue';

const jackets = CATALOG_SEARCHES.find(search => search.category === 'Outerwear')!;
const entry = (id: number, name: string) => ({
  id, shortDescription: name, brand: { name: 'Toteme' }, price: 900,
  images: [{ order: 1, size: '1000', url: `https://cdn-images.farfetch-contents.com/${id}_1000.jpg` }],
});

describe('Shop catalogue', () => {
  it('reads the saved Farfetch file the same way as the live feed', () => {
    const products = readCatalogueFixture(JSON.parse(fixtureText));
    expect(products.map(product => [product.category, product.name])).toEqual([
      ['Outerwear', 'logo-patch varsity jacket'],
      ['Outerwear', 'cashmere belted coat'],
      ['Outerwear', 'patch-detail bomber jacket'],
      ['Dresses', 'motorcycle hole mini dress'],
    ]);
    // Stock counts 6, 2, none and 1 in the file.
    expect(products.map(product => product.availability)).toEqual(['in_stock', 'low_stock', 'unknown', 'low_stock']);
    expect(products[0]).toMatchObject({
      id: '18535208', brand: 'Off-White', price: 4169, sizes: ['XS', 'S', 'M'],
      image: 'https://cdn-images.farfetch-contents.com/18/53/52/08/18535208_41095700_1000.jpg',
      link: 'https://www.farfetch.com/shopping/women/logo-patch-varsity-jacket-item-18535208.aspx',
    });
  });

  it('keeps three pieces a search, only those whose names fit its category', () => {
    const payload = { products: { entries: [entry(1, 'wool coat'), entry(2, 'straight jeans'), entry(3, 'denim jacket'), entry(4, 'cropped blazer'), entry(5, 'trench coat')] } };
    expect(readCatalogueSearch(payload, jackets).map(product => product.id)).toEqual(['1', '3', '4']);
  });

  it('lists a piece once when two searches return it', () => {
    const coat = { products: { entries: [entry(7, 'cashmere coat dress')] } };
    const products = readCatalogueFixture({ searches: { 'jacket women': coat, 'slip dress women': coat } });
    expect(products.map(product => [product.id, product.category])).toEqual([['7', 'Outerwear']]);
  });

  it('treats a missing or damaged file as no pieces', () => {
    expect(readCatalogueFixture(null)).toEqual([]);
    expect(readCatalogueFixture({ searches: { 'jacket women': 'not a payload' } })).toEqual([]);
  });
});
