import { describe, expect, it } from 'vitest';
import { findProducts, findSongs, fold, liveItem, matches, mergeProducts, namesHouse, relevantLive, type SearchProduct, type SongHit } from './fashion-music-search';

const song = (id: string, title: string, artist: string, source = 'Hot 100', extra?: string): SongHit =>
  ({ id, title, artist, source, href: `https://open.spotify.com/search/${id}`, ...(extra ? { extra } : {}) });

const product = (id: string, brand: string, name: string, more: Partial<SearchProduct> = {}): SearchProduct =>
  ({ id, brand, name, price: 100, currency: 'USD', image: `https://cdn.example/${id}.jpg`, link: `https://www.farfetch.com/${id}`, ...more });

describe('fashion and music search', () => {
  it('ignores case, accents and punctuation', () => {
    expect(fold('  Beyoncé — Off-White ')).toBe('beyonce off white');
    expect(matches('beyonce', 'BEYONCÉ')).toBe(true);
    expect(matches('off white', 'Off-White crystal biker suit')).toBe(true);
    expect(matches('R&B', 'Genres: R&B, Pop')).toBe(true);
  });

  it('needs every word, matched from the start of a word', () => {
    expect(matches('slip dress', 'Silk slip dress')).toBe(true);
    expect(matches('jack', 'Leather jacket')).toBe(true);
    expect(matches('acket', 'Leather jacket')).toBe(false);
    expect(matches('slip coat', 'Silk slip dress')).toBe(false);
    expect(matches('   ', 'anything')).toBe(false);
  });

  it('finds songs by title, artist or what else they carry, each song once', () => {
    const songs = [
      song('a', 'Yeah!', 'Usher feat. Lil Jon & Ludacris', "Editor's pick", 'Confessions Off-White'),
      song('b', 'Yeah!', 'Usher', 'Hot 100'),
      song('c', 'Espresso', 'Sabrina Carpenter'),
    ];
    expect(findSongs(songs, 'usher').map(s => s.id)).toEqual(['a']);
    expect(findSongs(songs, 'off white').map(s => s.id)).toEqual(['a']);
    expect(findSongs(songs, 'sabrina espresso').map(s => s.id)).toEqual(['c']);
    expect(findSongs(songs, 'e', 1)).toHaveLength(1);
    expect(findSongs(songs, '')).toEqual([]);
  });

  it('finds catalogue products by brand, name, category or tags', () => {
    const products = [
      product('1', 'Prada', 'Re-Nylon jacket', { category: 'Outerwear', tags: ['nylon'] }),
      product('2', 'Khaite', 'Silk slip dress', { category: 'Dresses' }),
    ];
    expect(findProducts(products, 'prada').map(p => p.id)).toEqual(['1']);
    expect(findProducts(products, 'outerwear').map(p => p.id)).toEqual(['1']);
    expect(findProducts(products, 'slip').map(p => p.id)).toEqual(['2']);
    expect(findProducts(products, 'gown')).toEqual([]);
  });

  it('only sends live searches the server accepts', () => {
    expect(liveItem('  Slip   Dress ')).toBe('slip dress');
    expect(liveItem('t-shirt')).toBe('t-shirt');
    expect(liveItem('ab')).toBeNull();
    expect(liveItem('good 4 u')).toBeNull();
    expect(liveItem('Beyoncé')).toBeNull();
    expect(liveItem('a'.repeat(61))).toBeNull();
  });

  it('keeps live products that answer the query, then merges without repeats', () => {
    const live = [product('3', 'Toteme', 'wool slip dress'), product('4', 'Nike', 'logo socks'), product('5', 'Prada', 'canvas tote')];
    expect(relevantLive(live, 'slip dress').map(p => p.id)).toEqual(['3']);
    expect(relevantLive(live, 'prada').map(p => p.id)).toEqual(['5']);
    expect(namesHouse(live, 'prada')).toBe(true);
    expect(namesHouse([product('6', 'Off-White', 'shoe charm')], 'off white')).toBe(true);
    expect(namesHouse(live, 'slip dress')).toBe(false);
    const first = [product('2', 'Khaite', 'Silk slip dress'), product('3', 'Toteme', 'wool slip dress')];
    expect(mergeProducts(first, live).map(p => p.id)).toEqual(['2', '3', '4', '5']);
    expect(mergeProducts(first, live, 2).map(p => p.id)).toEqual(['2', '3']);
  });
});
