import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { CONTENTFUL_CDN } from './contentful';
import { piecesUrl, readPieces, readSongLook, songLookUrl, type LookBasis, type LookPiece } from './contentful-looks';

export type SongLookReply = { pieces: LookPiece[]; basis: LookBasis | null; status: 'ok' | 'not_configured' | 'unavailable' };

// A look changes when an editor relinks it: one answer per song for ten minutes, per server instance.
const TEN_MINUTES = 10 * 60 * 1000;
const cache = new Map<string, { at: number; reply: Promise<Omit<SongLookReply, 'status'> | null> }>();

/** The pieces for a song's product card, from Contentful: the song's own, else its artist's (then similar artists'), else
 *  its genre's. No pieces (and `basis` null) when Contentful has nothing photographed for it; the card then keeps its
 *  built-in line-up. Without CONTENTFUL_SPACE_ID and CONTENTFUL_API_KEY it answers `not_configured`. */
export const getSongLook = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ caption: z.string().trim().min(3).max(200) }).strict().parse(input))
  .handler(async ({ data }): Promise<SongLookReply> => {
    const space = process.env['CONTENTFUL_SPACE_ID'];
    const token = process.env['CONTENTFUL_API_KEY'];
    if (!space || !token) return { pieces: [], basis: null, status: 'not_configured' };
    const place = { base: process.env['CONTENTFUL_API_URL'] || CONTENTFUL_CDN, space, environment: process.env['CONTENTFUL_ENVIRONMENT'] || undefined };
    const read = async (url: string): Promise<unknown> => {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Contentful returned ${response.status}`);
      return response.json();
    };
    const saved = cache.get(data.caption);
    if (!saved || Date.now() - saved.at > TEN_MINUTES) {
      cache.set(data.caption, { at: Date.now(), reply: (async () => {
        const song = readSongLook(await read(songLookUrl(place, data.caption)));
        if (song.pieces.length) return { pieces: song.pieces, basis: 'song' as const };
        if (song.artistIds.length) {
          const pieces = readPieces(await read(piecesUrl(place, 'artists', song.artistIds)), 'artist', { field: 'artists', ids: song.artistIds });
          if (pieces.length) return { pieces, basis: 'artist' as const };
        }
        if (song.genreIds.length) {
          const pieces = readPieces(await read(piecesUrl(place, 'genres', song.genreIds)), 'genre', { field: 'genres', ids: song.genreIds });
          if (pieces.length) return { pieces, basis: 'genre' as const };
        }
        return { pieces: [], basis: null };
      })().catch(failure => {
        // A failure isn't remembered, so the next song tries again. Server log only: never the token.
        console.error('[Contentful] song look failed', failure instanceof Error ? failure.message : failure);
        cache.delete(data.caption);
        return null;
      }) });
    }
    const reply = await cache.get(data.caption)!.reply;
    return reply ? { ...reply, status: 'ok' } : { pieces: [], basis: null, status: 'unavailable' };
  });
