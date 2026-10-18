import { describe, expect, it } from 'vitest';
import { fallLook } from './fall-looks';

const cardigans = ['ribbed cardigan', 'faux-pearl ribbed cardigan', 'short-sleeve cardigan', 'cropped cardigan', 'wool cardigan', 'cashmere cardigan']
  .map((name, i) => ({ id: String(23400000 + i * 7919), category: 'Knitwear', name }));

describe('fallLook', () => {
  it('always gives the same piece the same look', () => {
    const piece = { id: '23418977', category: 'Outerwear', name: 'cropped jacket' };
    expect(fallLook(piece)).toBe(fallLook({ ...piece }));
  });

  it('varies the look across pieces of one category, so neighbouring cards differ', () => {
    const looks = new Set(cardigans.map(fallLook));
    expect(looks.size).toBeGreaterThanOrEqual(3);
  });

  it('keeps each category to looks written for it', () => {
    const skirtLooks = new Set(Array.from({ length: 40 }, (_, i) => fallLook({ id: String(i), category: 'Skirts', name: 'mini skirt' })));
    const bagLooks = new Set(Array.from({ length: 40 }, (_, i) => fallLook({ id: String(i), category: 'Bags', name: 'shoulder bag' })));
    expect(skirtLooks.size).toBe(4);
    expect([...skirtLooks].some(look => bagLooks.has(look))).toBe(false);
  });

  it('uses the name when a piece has no id', () => {
    expect(fallLook({ category: 'Tops', name: 'silk blouse' })).toBe(fallLook({ id: 'silk blouse', category: 'Tops', name: 'other' }));
  });

  it('falls back to a general fall look for a category the shop does not load yet', () => {
    expect(fallLook({ id: '1', category: 'Shoes', name: 'ankle boot' })).toBe('Layered with a long coat and boots');
  });
});
