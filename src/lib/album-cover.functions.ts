import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { albumQuery, pickAlbumCover } from './album-cover';

// MusicBrainz asks clients to name themselves and stay at or under one request per second.
const USER_AGENT = 'MelodyLust/0.1 (independent fashion journal)';
const cache = new Map<string, Promise<string | null>>();
let queue = Promise.resolve();

function throttled<T>(task: () => Promise<T>) {
  const run = queue.then(task);
  queue = run.then(() => new Promise(resolve => setTimeout(resolve, 1500)), () => new Promise(resolve => setTimeout(resolve, 1500)));
  return run;
}

async function search(album: string, artist: string) {
  const url = `https://musicbrainz.org/ws/2/release-group/?${new URLSearchParams({ query: albumQuery(album, artist), fmt: 'json', limit: '10' })}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller.signal });
      // MusicBrainz answers bursts with 503; one short pause is usually enough.
      if (response.status === 503 && attempt === 0) { await new Promise(resolve => setTimeout(resolve, 2500)); continue; }
      return response.ok ? pickAlbumCover(await response.json(), album, artist) : null;
    }
  } finally { clearTimeout(timer); }
}

export const lookupAlbumCover = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ album: z.string().trim().min(1).max(200), artist: z.string().trim().min(1).max(200) }).strict().parse(input))
  .handler(async ({ data }): Promise<{ coverUrl: string | null }> => {
    const id = `${data.album}|${data.artist}`.toLowerCase();
    if (!cache.has(id)) {
      // Only found covers stay cached, so a miss or outage is retried later.
      cache.set(id, throttled(() => search(data.album, data.artist))
        .catch(failure => { console.error('[AlbumCover] lookup failed', failure instanceof Error ? failure.message : failure); return null; })
        .then(url => { if (!url) cache.delete(id); return url; }));
    }
    return { coverUrl: await cache.get(id)! };
  });
