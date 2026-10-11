// Pure helpers for the product step of a look: turn a Farfetch search payload (RapidAPI
// "farfetch-data") into small product cards, and turn a style-notes piece into a search
// keyword. Kept apart from the server function so it can be unit-tested without a key.
// The source is swappable: an affiliate feed only needs its own reader into ShopProduct.

import { foldName } from './song-recommendations';

export type ShopProduct = { id: string; brand: string; name: string; price: number; currency: string; image: string; link: string };

type FarfetchImage = { size?: unknown; url?: unknown };
type FarfetchEntry = { id?: unknown; shortDescription?: unknown; brand?: { name?: unknown }; price?: unknown; currencyIsoCode?: unknown; images?: unknown };

/** Largest image no wider than this, so cards stay light. */
const IMAGE_WIDTH = 400;

function pickImage(images: unknown) {
  const usable = (Array.isArray(images) ? images as FarfetchImage[] : [])
    .flatMap(image => (typeof image.url === 'string' && image.url.startsWith('https://') ? [{ url: image.url, width: Number(image.size) || 0 }] : []));
  // Farfetch lists every size of the first photo before the second photo, so the first fit is the lead image.
  return usable.find(image => image.width === IMAGE_WIDTH)?.url
    ?? usable.filter(image => image.width < IMAGE_WIDTH).at(-1)?.url
    ?? usable[0]?.url ?? null;
}

/** Farfetch search for the exact product, so the link always lands on something real. */
export const farfetchLink = (brand: string, name: string) => `https://www.farfetch.com/shopping/search/items.aspx?q=${encodeURIComponent(`${brand} ${name}`)}`;

/** Search payload → up to `limit` priced, pictured products from the requested house only. */
export function readFarfetchSearch(payload: unknown, designer: string, limit = 3): ShopProduct[] {
  const entries = payload && typeof payload === 'object' && 'products' in payload && payload.products && typeof payload.products === 'object' && 'entries' in payload.products && Array.isArray(payload.products.entries)
    ? payload.products.entries as FarfetchEntry[] : [];
  const house = foldName(designer);
  const products: ShopProduct[] = [];
  for (const entry of entries) {
    const brand = typeof entry.brand?.name === 'string' ? entry.brand.name : '';
    const name = typeof entry.shortDescription === 'string' ? entry.shortDescription.trim() : '';
    const image = pickImage(entry.images);
    if (!brand || foldName(brand) !== house || !name || !image || typeof entry.price !== 'number' || entry.price <= 0) continue;
    products.push({
      id: String(entry.id), brand, name, image,
      price: entry.price,
      currency: typeof entry.currencyIsoCode === 'string' ? entry.currencyIsoCode : 'USD',
      link: farfetchLink(brand, name),
    });
    if (products.length >= limit) break;
  }
  return products;
}

const TRAILING_NOISE = new Set(['stack', 'set', 'look', 'layer', 'layers', 'pair', 'combo', 'moment']);

/** "Crystal-encrusted biker jacket" → "jacket"; "Layered metallic choker stack" → "choker". */
export function pieceKeyword(piece: string) {
  const words = piece.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length > 1 && TRAILING_NOISE.has(words.at(-1)!)) words.pop();
  return words.at(-1) ?? '';
}

export const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
