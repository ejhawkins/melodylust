/**
 * The house's own online store, so a setlist row can send the reader from the song to the clothes. Only the official
 * site of the house that showed the collection: no resellers, no affiliate links. The reader leaves for the house's
 * store; nothing is bought here. Checked 2026-11-27.
 */
export const HOUSE_SHOPS: Readonly<Record<string, string>> = {
  'thom browne': 'https://www.thombrowne.com',
  'rick owens': 'https://www.rickowens.eu',
  'bottega veneta': 'https://www.bottegaveneta.com',
  'louis vuitton': 'https://www.louisvuitton.com',
  'maison margiela': 'https://www.maisonmargiela.com',
  'wales bonner': 'https://walesbonner.com',
  loewe: 'https://www.loewe.com',
  prada: 'https://www.prada.com',
  balenciaga: 'https://www.balenciaga.com',
  celine: 'https://www.celine.com',
  kenzo: 'https://www.kenzo.com',
  'pyer moss': 'https://www.pyermoss.com',
};

const key = (house: string) => house.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The house's store, or null when we have none on file. */
export function houseShop(house: string): { house: string; url: string } | null {
  const url = HOUSE_SHOPS[key(house)];
  return url ? { house, url } : null;
}
