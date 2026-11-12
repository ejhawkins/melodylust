// The home Shop's catalogue: six Farfetch searches, three pieces from each. Pure, so the live answers
// and the saved test file (fixtures/farfetch-catalogue.json) go through exactly the same rules, and both
// are unit-tested without a RapidAPI key.

import { readFarfetchCatalog, type CatalogProduct } from './farfetch';

export const CATALOG_SEARCHES = [
  { keyword: 'cardigan women', category: 'Knitwear', names: ['cardigan'] },
  { keyword: 'mini skirt women', category: 'Skirts', names: ['skirt'] },
  { keyword: 'jacket women', category: 'Outerwear', names: ['jacket', 'coat', 'blazer'] },
  { keyword: 'slip dress women', category: 'Dresses', names: ['dress', 'gown'] },
  { keyword: 'top women', category: 'Tops', names: ['top', 'shirt', 'blouse', 'vest'] },
  { keyword: 'shoulder bag women', category: 'Bags', names: ['bag', 'tote'] },
] as const;

export type CatalogSearch = (typeof CATALOG_SEARCHES)[number];

/** One search's answer → up to three pieces whose names fit its category (a "jacket" search also turns up jeans). */
export function readCatalogueSearch(payload: unknown, { category, names }: CatalogSearch): CatalogProduct[] {
  return readFarfetchCatalog(payload, category, 30)
    .filter(product => names.some(name => product.name.toLowerCase().includes(name)))
    .slice(0, 3);
}

/** Every search's pieces in search order, each product once. */
export const mergeCatalogue = (lists: CatalogProduct[][]) =>
  lists.flat().filter((product, index, all) => all.findIndex(other => other.id === product.id) === index);

/** The saved test file → the Shop's pieces. Its `searches` holds raw search.php answers keyed by keyword;
 *  a missing or damaged answer counts as no pieces. */
export function readCatalogueFixture(file: unknown): CatalogProduct[] {
  const searches = file && typeof file === 'object' && 'searches' in file && file.searches && typeof file.searches === 'object'
    ? file.searches as Record<string, unknown> : {};
  return mergeCatalogue(CATALOG_SEARCHES.map(search => readCatalogueSearch(searches[search.keyword], search)));
}
