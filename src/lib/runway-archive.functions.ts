import { createServerFn } from '@tanstack/react-start';
import { archiveSongs } from './runway-archive';
import type { RunwaySong } from './runway-songs';

const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 5000;

export type RunwayArchive = { songs: RunwaySong[]; connected: boolean };

let cache: { at: number; songs: RunwaySong[] } | null = null;

/**
 * Published Runway Songs archive songs from Contentful's Content Delivery API, with their shows, designers and
 * designer photos (include=3). The delivery token is read inside the handler and never reaches the browser.
 * Without a space configured the player plays the sampler's songs alone.
 */
export const getRunwayArchive = createServerFn({ method: 'GET' }).handler(async (): Promise<RunwayArchive> => {
  const space = process.env['CONTENTFUL_SPACE_ID'];
  const token = process.env['CONTENTFUL_DELIVERY_TOKEN'];
  if (!space || !token) return { songs: [], connected: false };

  if (cache && Date.now() - cache.at < CACHE_MS) return { songs: cache.songs, connected: true };

  const environment = process.env['CONTENTFUL_ENVIRONMENT'] || 'master';
  const endpoint =
    `https://cdn.contentful.com/spaces/${encodeURIComponent(space)}/environments/${encodeURIComponent(environment)}/entries` +
    '?content_type=runwaySong&include=3&limit=1000';

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(`Contentful request failed [${response.status}]: ${await response.text()}`);
      return { songs: cache?.songs ?? [], connected: true };
    }

    const songs = archiveSongs(await response.json());
    cache = { at: Date.now(), songs };
    return { songs, connected: true };
  } catch (error) {
    console.error('Contentful request could not be completed', error instanceof Error ? error.message : error);
    return { songs: cache?.songs ?? [], connected: true };
  }
});
