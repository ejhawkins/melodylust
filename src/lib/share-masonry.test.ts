import { describe, expect, it } from 'vitest';
import { masonry, photoHeight } from './share-masonry';

const area = { left: 10, top: 100, bottom: 500, cols: 2, colW: 100, gap: 10 };

describe('share card masonry', () => {
  it('drops each tile into the shortest column', () => {
    const { spots, hidden } = masonry([200, 50, 50, 50], area);
    expect(spots).toEqual([
      { index: 0, x: 10, y: 100 },
      { index: 1, x: 120, y: 100 },
      { index: 2, x: 120, y: 160 },
      { index: 3, x: 120, y: 220 },
    ]);
    expect(hidden).toBe(0);
  });

  it('stops at the first tile past the bottom and counts the rest as hidden', () => {
    const { spots, hidden } = masonry([300, 300, 300, 20], area);
    expect(spots.map(s => s.index)).toEqual([0, 1]);
    expect(hidden).toBe(2);
  });

  it('keeps a photo’s shape within 4:3 and 2:3', () => {
    expect(photoHeight(100, 400, 500)).toBe(125);
    expect(photoHeight(100, 1000, 200)).toBe(75);
    expect(photoHeight(100, 200, 1000)).toBe(150);
    expect(photoHeight(100, 0, 0)).toBe(100);
  });
});
