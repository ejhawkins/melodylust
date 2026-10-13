// Chooses which real catalog products to show for an outfit. Pure and deterministic: the same
// artist + outfit always gets the same cards, while different artists draw different cards from
// the same shared search results. Only products the catalog returned can be picked — nothing is invented.

import { garmentMatches, itemMatchScore, type ShopProduct } from './farfetch';
import { normalizeArtistName } from './artist-search';

/** How many catalog results each piece's search keeps as candidates. */
export const CANDIDATE_POOL = 8;
/** The pick is varied only among this many best-matching candidates, so relevance comes first. */
const TOP_K = 5;

/** Creative, not evidence: words in a product name that suit a genre's editorial outfit. */
const GENRE_AFFINITY: [RegExp, string[]][] = [
  [/^(rock|punk|metal|alternative|grunge)$/, ['leather', 'black', 'distressed', 'studded', 'biker', 'denim', 'combat', 'washed']],
  [/^(r and b|soul)$/, ['satin', 'silk', 'velvet', 'gold', 'pendant', 'wide', 'pleated', 'suede']],
  [/^(hip hop|rap)$/, ['oversized', 'logo', 'cargo', 'track', 'chunky', 'baggy', 'gold', 'chain']],
  [/^(pop|dance|disco)$/, ['sequin', 'metallic', 'pink', 'yellow', 'red', 'cropped', 'glitter', 'colour', 'color']],
  [/^(jazz|blues)$/, ['wool', 'tweed', 'tailored', 'brown', 'pleated', 'knit', 'pinstripe']],
  [/^(electronic|house|techno|edm)$/, ['nylon', 'technical', 'reflective', 'mesh', 'zip', 'shell', 'black']],
  [/^(country|folk)$/, ['suede', 'western', 'denim', 'fringe', 'cowboy', 'plaid', 'leather']],
  [/^(indie|singer songwriter)$/, ['striped', 'cardigan', 'corduroy', 'vintage', 'check', 'linen']],
];

const stems = (text: string) => new Set(text.toLowerCase().match(/[a-z]+/g)?.map(word => word.slice(0, 5)) ?? []);

/** Genre words a product name shares with the artist's genres (0 when no genre is known). */
export function genreAffinity(productName: string, genres: string[]) {
  const words = [...new Set(genres.flatMap(genre => GENRE_AFFINITY.find(([pattern]) => pattern.test(normalizeArtistName(genre)))?.[1] ?? []))];
  const name = stems(productName);
  return words.filter(word => name.has(word.slice(0, 5))).length;
}

/** FNV-1a: a small, stable hash so a seed always orders candidates the same way. */
export function stableHash(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash;
}

export type PiecePool = { item: string; products: ShopProduct[] };

/** One product per piece: keep products of the piece's garment, rank them by item match, then genre fit,
 *  keep the best TOP_K, and choose among them by `seed`. A product already used for an earlier piece is never repeated. */
export function pickOutfitProducts(pools: PiecePool[], seed: string, genres: string[] = []): ShopProduct[] {
  const used = new Set<string>();
  const picks: ShopProduct[] = [];
  for (const { item, products } of pools) {
    const best = products
      .map((product, index) => ({ product, index, match: itemMatchScore(item, product.name), fit: genreAffinity(product.name, genres) }))
      .filter(entry => entry.match > 0 && garmentMatches(item, entry.product.name) && !used.has(entry.product.id))
      .sort((a, b) => b.match - a.match || b.fit - a.fit || a.index - b.index)
      .slice(0, TOP_K);
    const pick = best.sort((a, b) => stableHash(`${seed}|${item}|${a.product.id}`) - stableHash(`${seed}|${item}|${b.product.id}`))[0];
    if (pick) { used.add(pick.product.id); picks.push(pick.product); }
  }
  return picks;
}

// QA metrics, shared by tests and reports.

/** Share of product IDs two result sets have in common (Jaccard: 0 = none, 1 = identical). */
export function productOverlap(a: ShopProduct[], b: ShopProduct[]) {
  const left = new Set(a.map(product => product.id));
  const right = new Set(b.map(product => product.id));
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter(id => right.has(id)).length / union.size : 0;
}

/** Product IDs that appear more than once in one result set. */
export const duplicateIds = (products: ShopProduct[]) =>
  [...new Set(products.map(product => product.id).filter((id, index, all) => all.indexOf(id) !== index))];
