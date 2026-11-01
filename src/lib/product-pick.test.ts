import { describe, expect, it } from 'vitest';
import type { ShopProduct } from './farfetch';
import { recommendArtistLooks, type ResolvedStyleArtist } from './artist-style';
import { outfitSearchItems } from './outfit-search';
import { CANDIDATE_POOL, duplicateIds, genreAffinity, pickOutfitProducts, productOverlap, stableHash, type PiecePool } from './product-pick';

// A fixed catalog sample: every search returns CANDIDATE_POOL real-looking listings whose names
// contain the searched item, in a fixed order (like Farfetch's default order). IDs are unique per search.
const FINISHES = ['basic', 'black leather', 'satin', 'oversized logo', 'sequin', 'wool tailored', 'nylon technical', 'suede western', 'striped', 'distressed denim'];
const catalog = (item: string): ShopProduct[] => FINISHES.slice(0, CANDIDATE_POOL).map((finish, index) => ({
  id: `${item}#${index}`, brand: 'Sample', name: `${finish} ${item}`, price: 100 + index, currency: 'USD', image: 'https://cdn-images.farfetch-contents.com/x_400.jpg', link: 'https://www.farfetch.com/',
}));
const poolsFor = (items: string[]): PiecePool[] => items.map(item => ({ item, products: catalog(item) }));

const artist = (name: string, genres: string[]): ResolvedStyleArtist => ({ id: `test:${name}`, name, source: 'melodylust', genres });
const ARTISTS = [
  artist('Gwen Stefani', ['Pop', 'Rock']), artist('Bruno Mars', ['Pop', 'R&B']), artist('Dua Lipa', ['Pop', 'Dance']),
  artist('Usher', ['R&B']), artist('Kendrick Lamar', ['Hip-hop']), artist('Kacey Musgraves', ['Country']), artist('Unknown Genre', []),
];

/** The first outfit each artist sees, as products: the old way (first catalog result per piece) and the new way. */
function firstOutfit(who: ResolvedStyleArtist) {
  const look = recommendArtistLooks(who, []).looks[0]!;
  const pools = poolsFor(outfitSearchItems(look.pieces));
  return { before: pools.flatMap(pool => pool.products.slice(0, 1)), after: pickOutfitProducts(pools, `${who.id}|${look.id}`, who.genres) };
}
const pairs = <T,>(list: T[]) => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b] as const));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('QA: the same products should not appear for every artist', () => {
  const outfits = ARTISTS.map(who => ({ who, ...firstOutfit(who) }));
  const overlaps = pairs(outfits).map(([a, b]) => ({ pair: `${a.who.name} × ${b.who.name}`, before: productOverlap(a.before, b.before), after: productOverlap(a.after, b.after) }));

  it('reports overlap before and after (printed for review)', () => {
    console.table(overlaps.map(row => ({ pair: row.pair, before: row.before.toFixed(2), after: row.after.toFixed(2) })));
    console.info(`Mean overlap — before: ${mean(overlaps.map(row => row.before)).toFixed(2)}, after: ${mean(overlaps.map(row => row.after)).toFixed(2)}`);
  });

  it('documents the bug: artists with the same genre got identical products', () => {
    const popPair = overlaps.find(row => row.pair === 'Bruno Mars × Dua Lipa')!;
    expect(popPair.before).toBe(1);
  });

  it('cuts mean overlap between different artists by at least half, and below 15%', () => {
    const before = mean(overlaps.map(row => row.before));
    const after = mean(overlaps.map(row => row.after));
    expect(after).toBeLessThanOrEqual(before / 2);
    expect(after).toBeLessThan(0.15);
  });

  it('no two artists share a whole outfit of products', () => {
    for (const row of overlaps) expect(row.after, row.pair).toBeLessThan(1);
  });

  it('never repeats a product inside one outfit, even when searches return the same listing', () => {
    // Two pieces of the same garment ("shirt" and "silk shirt") can both be offered one listing.
    const shared: ShopProduct = { ...catalog('shirt')[0]!, id: 'same-listing', name: 'satin silk shirt' };
    const picks = pickOutfitProducts([{ item: 'shirt', products: [shared] }, { item: 'silk shirt', products: [shared, ...catalog('silk shirt')] }], 'seed');
    expect(duplicateIds(picks)).toEqual([]);
    expect(picks.map(p => p.id)[0]).toBe('same-listing');
  });
});

describe('picking products for an outfit', () => {
  const pools = poolsFor(['satin shirt', 'wide-leg trousers', 'loafers', 'necklace']);

  it('is deterministic: the same artist and outfit always get the same cards', () => {
    expect(pickOutfitProducts(pools, 'usher|soft', ['R&B'])).toEqual(pickOutfitProducts(pools, 'usher|soft', ['R&B']));
    expect(stableHash('abc')).toBe(stableHash('abc'));
  });

  it('never invents a product: every pick is a listing the catalog returned', () => {
    const ids = new Set(pools.flatMap(pool => pool.products.map(p => p.id)));
    for (const seed of ['a', 'b', 'c', 'd']) for (const pick of pickOutfitProducts(pools, seed)) expect(ids.has(pick.id)).toBe(true);
  });

  it('skips listings that do not match the piece, and returns nothing for an empty search', () => {
    const offTopic = catalog('candle');
    expect(pickOutfitProducts([{ item: 'loafers', products: offTopic }], 'seed')).toEqual([]);
    expect(pickOutfitProducts([{ item: 'loafers', products: [] }], 'seed')).toEqual([]);
  });

  it('steers toward genre-suited listings without inventing evidence', () => {
    expect(genreAffinity('black leather biker jacket', ['Rock'])).toBeGreaterThan(0);
    expect(genreAffinity('satin shirt', ['R&B'])).toBeGreaterThan(0);
    expect(genreAffinity('satin shirt', [])).toBe(0);
    // A Rock-suited listing that the catalog lists last joins the shortlist for Rock, and only for Rock.
    const late = [...catalog('jacket').filter(p => !p.name.includes('leather')), { ...catalog('jacket')[0]!, id: 'late', name: 'black leather biker jacket' }];
    const seeds = Array.from({ length: 40 }, (_, i) => `artist-${i}`);
    const picked = (genres: string[]) => seeds.map(seed => pickOutfitProducts([{ item: 'jacket', products: late }], seed, genres)[0]!.id);
    expect(picked([])).not.toContain('late');
    expect(picked(['Rock'])).toContain('late');
  });
});

describe('outfit pieces become specific searches', () => {
  it('uses the describing word from the piece note when the name alone is generic', () => {
    expect(outfitSearchItems([{ name: 'Shirt', detail: 'Try a fluid satin shirt with a relaxed collar.' }, { name: 'Knit top', detail: 'One saturated colour.' }, { name: 'Trousers', detail: 'Wide-leg trousers in a soft, matte fabric.' }]))
      .toEqual(['satin shirt', 'knit top', 'wide-leg trousers']);
  });

  it('keeps the existing behaviour for already specific names', () => {
    expect(outfitSearchItems([{ name: 'Cropped leather jacket' }, { name: 'Wide-leg trousers' }, { name: 'Statement chain belt' }]))
      .toEqual(['cropped leather jacket', 'wide-leg trousers', 'chain belt']);
  });
});
