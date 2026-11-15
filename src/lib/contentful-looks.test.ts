import { describe, expect, it } from 'vitest';
import { NEUTRAL_SWATCH, PIECE_LIMIT, piecesUrl, readPieces, readSongLook, songLookUrl } from './contentful-looks';

const link = (id: string, linkType: 'Entry' | 'Asset' = 'Entry') => ({ sys: { type: 'Link', linkType, id } });
const entry = (id: string, type: string, fields: Record<string, unknown>) => ({ sys: { id, type: 'Entry', contentType: { sys: { type: 'Link', linkType: 'ContentType', id: type } } }, fields });
const asset = (id: string) => ({ sys: { id, type: 'Asset' }, fields: { file: { url: `//images.ctfassets.net/s/${id}.jpg`, contentType: 'image/jpeg' } } });
const photo = (id: string) => `https://images.ctfassets.net/s/${id}.jpg?w=1000&q=80`;

const blazer = entry('blazer', 'clothingItem', { name: 'Double-breasted blazer', note: 'Charcoal wool', price: '$295', category: 'outerwear', sizes: ['S', 'M', 'L'], colorways: [link('charcoal'), link('camel'), link('ghost')], artists: [link('wale')] });
const shirt = entry('shirt', 'clothingItem', { name: 'Silk camp-collar shirt', note: 'Abstract print', price: '$120', category: 'tops', image: link('shirt-photo', 'Asset'), kicker: 'Fashion month edit', collection: 'The Resort Edit', artists: [link('geazy')] });
const aviators = entry('aviators', 'clothingItem', { name: 'Tinted aviators', note: 'Amber lens', price: '$85', category: 'accessories' });

const songReply = {
  items: [entry('fashion-week', 'song', { caption: 'Fashion Week — Wale', title: 'Fashion Week', artist: link('wale'), genres: [link('hip-hop')], pieces: [link('blazer'), link('shirt'), link('aviators')] })],
  includes: {
    Entry: [
      blazer, shirt, aviators,
      entry('wale', 'artist', { name: 'Wale', hashtag: '#wale', similarArtists: [link('geazy'), link('wale')] }),
      entry('charcoal', 'colorway', { name: 'Charcoal', swatch: '#333333', image: link('blazer-charcoal', 'Asset') }),
      entry('camel', 'colorway', { name: 'Camel', swatch: 'tan', image: link('blazer-camel', 'Asset') }),
      entry('ghost', 'colorway', { name: 'Ghost', swatch: '#ffffff' }),
    ],
    Asset: [asset('blazer-charcoal'), asset('blazer-camel'), asset('shirt-photo')],
  },
};

describe('contentful looks', () => {
  it('asks for one song by its caption, three links deep', () => {
    expect(songLookUrl({ space: 'abc' }, 'Fashion Week — Wale')).toBe('https://cdn.contentful.com/spaces/abc/entries?content_type=song&fields.caption=Fashion%20Week%20%E2%80%94%20Wale&include=3&limit=1');
  });

  it('asks for clothing linked to any of the artists or genres', () => {
    expect(piecesUrl({ space: 'abc', environment: 'staging' }, 'artists', ['a1', 'a2'])).toBe(`https://cdn.contentful.com/spaces/abc/environments/staging/entries?content_type=clothingItem&fields.artists.sys.id[in]=a1,a2&include=2&limit=${PIECE_LIMIT * 2}`);
    expect(piecesUrl({ space: 'abc' }, 'genres', ['g1'])).toContain('fields.genres.sys.id[in]=g1');
  });

  it('reads a song’s pieces in the editor’s order, leaving out the one with nothing to photograph', () => {
    const look = readSongLook(songReply);
    expect(look.found).toBe(true);
    expect(look.pieces.map(p => p.name)).toEqual(['Double-breasted blazer', 'Silk camp-collar shirt']);
  });

  it('turns colourways into photos and swatches, skipping one without a photo and mending a bad swatch', () => {
    const [piece] = readSongLook(songReply).pieces;
    expect(piece).toMatchObject({ id: 'blazer', price: '$295', sizes: ['S', 'M', 'L'], kicker: 'Styled for this song', collection: 'Outerwear' });
    expect(piece?.colors).toEqual([
      { name: 'Charcoal', image: photo('blazer-charcoal'), alt: 'Double-breasted blazer in Charcoal', swatch: '', swatchColor: '#333333' },
      { name: 'Camel', image: photo('blazer-camel'), alt: 'Double-breasted blazer in Camel', swatch: '', swatchColor: NEUTRAL_SWATCH },
    ]);
  });

  it('uses a piece’s own photo, kicker and collection when it has them', () => {
    const piece = readSongLook(songReply).pieces[1];
    expect(piece).toMatchObject({ kicker: 'Fashion month edit', collection: 'The Resort Edit', sizes: [] });
    expect(piece?.colors).toEqual([{ name: 'Abstract print', image: photo('shirt-photo'), alt: 'Silk camp-collar shirt', swatch: '', swatchColor: NEUTRAL_SWATCH }]);
  });

  it('lists the song’s artist first, then similar artists once each, and its genres', () => {
    expect(readSongLook(songReply)).toMatchObject({ artistIds: ['wale', 'geazy'], genreIds: ['hip-hop'] });
  });

  it('reads a missing song, an error reply or nonsense as nothing found', () => {
    for (const reply of [{ items: [] }, { sys: { type: 'Error' }, message: 'no' }, null, 'x']) expect(readSongLook(reply)).toEqual({ found: false, pieces: [], artistIds: [], genreIds: [] });
  });

  it('puts the song’s own artist’s pieces ahead of a similar artist’s', () => {
    const reply = { items: [shirt, blazer, aviators, blazer], includes: songReply.includes };
    const pieces = readPieces(reply, 'artist', { field: 'artists', ids: ['wale', 'geazy'] });
    expect(pieces.map(p => p.id)).toEqual(['blazer', 'shirt']);
    expect(pieces[0]?.kicker).toBe('Styled for this artist');
    expect(readPieces(reply, 'genre').map(p => p.id)).toEqual(['shirt', 'blazer']);
  });

  it('never returns more pieces than the card steps through', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry(`p${i}`, 'clothingItem', { name: `Piece ${i}`, price: '$1', image: link('shirt-photo', 'Asset') }));
    expect(readPieces({ items: many, includes: songReply.includes }, 'genre')).toHaveLength(PIECE_LIMIT);
  });
});
