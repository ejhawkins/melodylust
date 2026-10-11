// Turns an outfit's pieces into catalog search terms. Pure, so the terms are tested without a key.

import { articleItems } from './article-items';
import { pieceKeyword } from './farfetch';

const SEARCHABLE = /^[a-z][a-z -]*$/;

/** "Shirt" + note "Try a fluid satin shirt" → "satin shirt"; "Knit top" → "knit top";
 *  "Statement chain belt" → "chain belt". A bare garment word is the last resort. */
export function pieceSearchTerm(piece: { name: string; detail?: string }) {
  const named = articleItems(piece.name, 1)[0];
  const garment = (named ?? pieceKeyword(piece.name)).split(' ').at(-1) ?? '';
  // The note often says which kind ("satin shirt", "wide-leg trousers"); use it when it names the same garment.
  const described = articleItems(piece.detail, 3).find(item => item.includes(' ') && item.split(' ').at(-1) === garment);
  if (described && (!named || !named.includes(' '))) return described;
  if (named) return named;
  // Not in the garment list ("Knit top"): keep the short name whole rather than searching for "top".
  const whole = piece.name.toLowerCase().trim();
  return whole.split(/\s+/).length <= 3 && SEARCHABLE.test(whole) ? whole : pieceKeyword(piece.name);
}

export const outfitSearchItems = (pieces: { name: string; detail?: string }[]) =>
  pieces.map(pieceSearchTerm).filter(item => SEARCHABLE.test(item));
