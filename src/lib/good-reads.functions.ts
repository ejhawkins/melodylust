import { createServerFn } from '@tanstack/react-start';
import { CONTENTFUL_CDN } from './contentful';
import { goodReadsUrl, readGoodReads, type GoodRead } from './good-reads';

export type GoodReadsReply = { reads: GoodRead[]; status: 'ok' | 'not_configured' | 'unavailable' };

// The list changes when an editor publishes a read: one answer for ten minutes, per server instance.
const TEN_MINUTES = 10 * 60 * 1000;
let cache: { at: number; reply: Promise<GoodRead[] | null> } | null = null;

/** The Reading Room's good reads from Contentful. Without CONTENTFUL_SPACE_ID and CONTENTFUL_API_KEY it answers
 *  `not_configured`, and on an outage `unavailable`; either way the zine keeps its sample list. */
export const getGoodReads = createServerFn({ method: 'GET' }).handler(async (): Promise<GoodReadsReply> => {
  const space = process.env['CONTENTFUL_SPACE_ID'];
  const token = process.env['CONTENTFUL_API_KEY'];
  if (!space || !token) return { reads: [], status: 'not_configured' };
  if (!cache || Date.now() - cache.at > TEN_MINUTES) {
    const url = goodReadsUrl({ base: process.env['CONTENTFUL_API_URL'] || CONTENTFUL_CDN, space, environment: process.env['CONTENTFUL_ENVIRONMENT'] || undefined });
    cache = { at: Date.now(), reply: (async () => {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Contentful returned ${response.status}`);
      return readGoodReads(await response.json());
    })().catch(failure => {
      // A failure isn't remembered, so the next visit tries again. Server log only: never the token.
      console.error('[Contentful] good reads failed', failure instanceof Error ? failure.message : failure);
      cache = null;
      return null;
    }) };
  }
  const reads = await cache.reply;
  return reads ? { reads, status: 'ok' } : { reads: [], status: 'unavailable' };
});
