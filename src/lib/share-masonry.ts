// Where the Want List share card's tiles go: a masonry of equal columns, each tile dropped into the shortest column so
// tall photos and short text tiles pack together. Kept apart from the canvas so it can be tested without a browser.

export type MasonryArea = { left: number; top: number; bottom: number; cols: number; colW: number; gap: number };
export type MasonrySpot = { index: number; x: number; y: number };

/** Places tiles in order, each in the shortest column (leftmost on a tie). Stops at the first tile that would run past
 *  the bottom, so the card keeps the list's order; `hidden` counts the tiles left off. */
export function masonry(heights: readonly number[], area: MasonryArea): { spots: MasonrySpot[]; hidden: number } {
  const cols = Math.max(1, Math.trunc(area.cols));
  const tops = Array.from({ length: cols }, () => area.top);
  const spots: MasonrySpot[] = [];
  for (const [index, height] of heights.entries()) {
    const col = tops.indexOf(Math.min(...tops));
    const y = tops[col] ?? area.top;
    if (y + height > area.bottom) return { spots, hidden: heights.length - index };
    spots.push({ index, x: area.left + col * (area.colW + area.gap), y });
    tops[col] = y + height + area.gap;
  }
  return { spots, hidden: 0 };
}

/** A photo's height in a column, its shape kept but held between landscape 4:3 and portrait 2:3 so one odd photo
 *  can't take the whole column or shrink to a strip. */
export function photoHeight(colW: number, naturalW: number, naturalH: number): number {
  const ratio = naturalW > 0 && naturalH > 0 ? naturalH / naturalW : 1;
  return Math.round(colW * Math.min(Math.max(ratio, 0.75), 1.5));
}
