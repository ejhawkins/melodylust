// Garments an article actually describes, so "Shop the article" can search for them even
// when no designer is named. Deterministic and literal: only words in the article's own
// text are used, matching the evidence rule that nothing is inferred or invented.

/** Multi-word items first, so "track pants" wins over "pants". */
const GARMENTS = [
  'tank top', 'crop top', 'track pants', 'cargo pants', 'wide-leg trousers', 'biker shorts', 'mini skirt', 'midi skirt',
  'maxi skirt', 'mini dress', 'midi dress', 'maxi dress', 'slip dress', 'ball gown', 'bomber jacket', 'leather jacket',
  'biker jacket', 'varsity jacket', 'denim jacket', 'trench coat', 'band tee', 'graphic tee', 'combat boots', 'knee-high boots',
  'platform boots', 'cowboy boots', 'chain belt', 'studded belt', 'bucket hat', 'baseball cap', 'roller skates',
  'tank', 'tee', 't-shirt', 'shirt', 'blouse', 'corset', 'bustier', 'bodysuit', 'jumpsuit', 'catsuit', 'hoodie', 'sweater',
  'cardigan', 'blazer', 'jacket', 'coat', 'cape', 'suit', 'tuxedo', 'vest', 'dress', 'gown', 'skirt', 'trousers', 'pants',
  'jeans', 'shorts', 'boots', 'sneakers', 'heels', 'pumps', 'loafers', 'sandals', 'belt', 'bag', 'handbag', 'scarf',
  'sunglasses', 'gloves', 'hat', 'pendant', 'necklace', 'earrings', 'choker',
];

/** Words worth keeping in front of an item: colours, prints, materials, finishes. */
const DESCRIPTORS = new Set([
  'black', 'white', 'red', 'blue', 'green', 'pink', 'purple', 'yellow', 'orange', 'brown', 'beige', 'ivory', 'silver', 'gold',
  'striped', 'plaid', 'tartan', 'checked', 'leopard', 'floral', 'polka-dot', 'sequinned', 'sequined', 'embellished', 'crystal',
  'studded', 'glittery', 'metallic', 'sheer', 'lace', 'leather', 'denim', 'silk', 'satin', 'velvet', 'mesh', 'knit', 'distressed',
  'cropped', 'oversized', 'baggy', 'vintage', 'punk', 'funky',
]);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "…a cropped red-and-blue striped tank top, baggy blue track pants…" → ["striped tank top", "blue track pants"]. */
export function articleItems(text: string | undefined, limit = 3): string[] {
  if (!text) return [];
  const lower = text.toLowerCase().replace(/[’']/g, "'");
  const found: { at: number; item: string }[] = [];
  const taken: [number, number][] = [];
  for (const garment of GARMENTS) {
    const pattern = new RegExp(`(?<![a-z-])${escape(garment)}(?![a-z])`, 'g');
    for (const match of lower.matchAll(pattern)) {
      const start = match.index!;
      const end = start + garment.length;
      // Skip "pants" inside an already-found "track pants".
      if (taken.some(([a, b]) => start >= a && end <= b)) continue;
      taken.push([start, end]);
      const before = lower.slice(Math.max(0, start - 30), start).trim().split(/[\s,;:()]+/).at(-1) ?? '';
      found.push({ at: start, item: DESCRIPTORS.has(before) ? `${before} ${garment}` : garment });
    }
  }
  return [...new Set(found.sort((a, b) => a.at - b.at).map(entry => entry.item))].slice(0, limit);
}
