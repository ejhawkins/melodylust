// The song-look model in Contentful (song, artist, genre, clothingItem, colorway), read into the pieces the Listening
// Room's product card shows. Nothing here holds a credential or makes a request: contentful-looks.functions.ts does that
// on the server. The card is a photograph first, so a piece with no image (its own or a colourway's) is left out.
import { assetUrl, entriesRoot } from './contentful';

/** One colour of a piece: its photo, and its swatch as a hex colour. `swatch` (a class) stays empty for these. */
export type LookColor = { name: string; image: string; alt: string; swatch: string; swatchColor: string };
/** A piece as the product card takes it. */
export type LookPiece = { id: string; kicker: string; name: string; collection: string; price: string; sizes: string[]; colors: LookColor[] };
/** Why a piece is on the card: linked to the song itself, to its artist (or one like them), or only to its genre. */
export type LookBasis = 'song' | 'artist' | 'genre';
export const BASIS_KICKER: Record<LookBasis, string> = { song: 'Styled for this song', artist: 'Styled for this artist', genre: 'From this genre' };

/** The most pieces one song's card steps through. */
export const PIECE_LIMIT = 10;
type Place = { base?: string; space: string; environment?: string | undefined };

/** The song with this caption, with its pieces, their colourways and photos, and its artist's similar artists. */
export const songLookUrl = (place: Place, caption: string) =>
  `${entriesRoot(place)}?content_type=song&fields.caption=${encodeURIComponent(caption)}&include=3&limit=1`;

/** Clothing linked to any of these artists or genres. Ids are Contentful's own, so they need no escaping beyond the URL's. */
export const piecesUrl = (place: Place, field: 'artists' | 'genres', ids: readonly string[]) =>
  `${entriesRoot(place)}?content_type=clothingItem&fields.${field}.sys.id[in]=${ids.map(encodeURIComponent).join(',')}&include=2&limit=${PIECE_LIMIT * 2}`;

type Bag = Record<string, unknown>;
const bag = (value: unknown): Bag | null => (value && typeof value === 'object' && !Array.isArray(value) ? value as Bag : null);
const text = (value: unknown, max = 300): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const idOf = (entity: unknown) => text(bag(bag(entity)?.['sys'])?.['id'], 200);
const linkIds = (value: unknown) => (Array.isArray(value) ? value : value ? [value] : []).map(idOf).filter(Boolean);
const typeOf = (entry: unknown) => text(bag(bag(bag(bag(entry)?.['sys'])?.['contentType'])?.['sys'])?.['id'], 100);
const HEX = /^#[0-9a-f]{6}$/i;
/** The swatch for a colourway that names no colour of its own. */
export const NEUTRAL_SWATCH = '#8a8a8a';
const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

type Linked = { entries: Map<string, unknown>; assets: Map<string, unknown>; items: unknown[] };
function linked(payload: unknown): Linked {
  const reply = bag(payload);
  const includes = bag(reply?.['includes']);
  const items = list(reply?.['items']);
  const entries = new Map<string, unknown>();
  for (const entry of [...items, ...list(includes?.['Entry'])]) { const id = idOf(entry); if (id) entries.set(id, entry); }
  const assets = new Map<string, unknown>();
  for (const asset of list(includes?.['Asset'])) { const id = idOf(asset); if (id) assets.set(id, asset); }
  return { entries, assets, items };
}

/** One clothingItem as a card piece, or null when it has no name, no price or nothing to photograph. */
function piece(entry: unknown, { entries, assets }: Linked, basis: LookBasis): LookPiece | null {
  const fields = bag(bag(entry)?.['fields']);
  const id = idOf(entry);
  const name = text(fields?.['name']);
  const price = text(fields?.['price'], 40);
  if (!fields || !id || !name || !price) return null;
  const colors: LookColor[] = [];
  for (const colorwayId of linkIds(fields['colorways'])) {
    const colorway = bag(bag(entries.get(colorwayId))?.['fields']);
    const image = assetUrl(assets.get(linkIds(colorway?.['image'])[0] ?? ''), 1000);
    const colorName = text(colorway?.['name'], 60);
    const swatch = text(colorway?.['swatch'], 7);
    if (image && colorName && !colors.some(c => c.name === colorName)) colors.push({ name: colorName, image, alt: `${name} in ${colorName}`, swatch: '', swatchColor: HEX.test(swatch) ? swatch : NEUTRAL_SWATCH });
  }
  if (!colors.length) {
    const image = assetUrl(assets.get(linkIds(fields['image'])[0] ?? ''), 1000);
    if (image) colors.push({ name: text(fields['note'], 60) || 'As shown', image, alt: name, swatch: '', swatchColor: NEUTRAL_SWATCH });
  }
  if (!colors.length) return null;
  return {
    id, name, price, colors,
    kicker: text(fields['kicker'], 60) || BASIS_KICKER[basis],
    collection: text(fields['collection'], 80) || title(text(fields['category'], 40)) || 'The edit',
    sizes: list(fields['sizes']).map(size => text(size, 12)).filter(Boolean).slice(0, 6),
  };
}

export type SongLook = {
  /** Whether Contentful has this song at all. */
  found: boolean;
  /** The song's own pieces, in the order its editor set. */
  pieces: LookPiece[];
  /** The song's artist first, then the artists filed as similar to them. */
  artistIds: string[];
  genreIds: string[];
};

/** A song reply (from songLookUrl) as the song's pieces and the ids its fallbacks search by. */
export function readSongLook(payload: unknown): SongLook {
  const graph = linked(payload);
  const song = graph.items.find(item => typeOf(item) === 'song');
  const fields = bag(bag(song)?.['fields']);
  if (!fields) return { found: false, pieces: [], artistIds: [], genreIds: [] };
  const artistId = linkIds(fields['artist'])[0];
  const similar = artistId ? linkIds(bag(bag(graph.entries.get(artistId))?.['fields'])?.['similarArtists']) : [];
  return {
    found: true,
    pieces: linkIds(fields['pieces']).flatMap(id => piece(graph.entries.get(id), graph, 'song') ?? []).slice(0, PIECE_LIMIT),
    artistIds: [...new Set([...(artistId ? [artistId] : []), ...similar])],
    genreIds: [...new Set(linkIds(fields['genres']))],
  };
}

/** A clothingItem reply (from piecesUrl) as card pieces. With `first`, pieces linked to those ids (the song's own artist,
 *  say) come before the rest, each group keeping Contentful's order. */
export function readPieces(payload: unknown, basis: LookBasis, first: { field: 'artists' | 'genres'; ids: readonly string[] } | null = null): LookPiece[] {
  const graph = linked(payload);
  const rank = (entry: unknown) => {
    if (!first) return 0;
    const ids = linkIds(bag(bag(entry)?.['fields'])?.[first.field]);
    const at = first.ids.findIndex(id => ids.includes(id));
    return at < 0 ? first.ids.length : at;
  };
  const seen = new Set<string>();
  return graph.items
    .filter(item => typeOf(item) === 'clothingItem')
    .map((entry, order) => ({ entry, order, rank: rank(entry) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .flatMap(({ entry }) => piece(entry, graph, basis) ?? [])
    .filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, PIECE_LIMIT);
}
