import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { CONTENTFUL_CDN, entriesUrl, readStories, type EditionStory } from './contentful';
import { EDITION_GENRES } from './genre-edition';

export type EditionReply = { stories: EditionStory[]; status: 'ok' | 'not_configured' | 'unavailable' };

// Editors publish a few times a day at most: one answer per genre for ten minutes, per server instance.
const TEN_MINUTES = 10 * 60 * 1000;
const cache = new Map<string, { at: number; reply: Promise<EditionStory[] | null> }>();

/** The journal's stories from Contentful, for one genre or (with none) every genre. Without CONTENTFUL_SPACE_ID and
 *  CONTENTFUL_API_KEY it answers `not_configured` and the room keeps its bundled stories; the same on an outage. */
export const getGenreStories = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ genre: z.enum(EDITION_GENRES).optional() }).strict().parse(input))
  .handler(async ({ data }): Promise<EditionReply> => {
    const space = process.env['CONTENTFUL_SPACE_ID'];
    const token = process.env['CONTENTFUL_API_KEY'];
    if (!space || !token) return { stories: [], status: 'not_configured' };
    const url = entriesUrl({ base: process.env['CONTENTFUL_API_URL'] || CONTENTFUL_CDN, space, environment: process.env['CONTENTFUL_ENVIRONMENT'] || undefined, genre: data.genre });
    const key = data.genre ?? 'all';
    const saved = cache.get(key);
    if (!saved || Date.now() - saved.at > TEN_MINUTES) {
      cache.set(key, { at: Date.now(), reply: (async () => {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`Contentful returned ${response.status}`);
        return readStories(await response.json());
      })().catch(failure => {
        // A failure isn't remembered, so the next visit tries again. Server log only: never the token.
        console.error('[Contentful] stories failed', failure instanceof Error ? failure.message : failure);
        cache.delete(key);
        return null;
      }) });
    }
    const stories = await cache.get(key)!.reply;
    return stories ? { stories, status: 'ok' } : { stories: [], status: 'unavailable' };
  });
