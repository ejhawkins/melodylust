import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readTrackDetails, type TrackDetails } from './freqblog';

// One lookup per song per server run: restyling back to a look shouldn't call FreqBlog again.
const cache = new Map<string, Promise<TrackDetails | null>>();

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
}

async function lookup(baseUrl: string, apiKey: string, track: string, artist: string) {
  const headers = { 'X-Api-Key': apiKey };
  const response = await fetchWithTimeout(`${baseUrl}/lookup?${new URLSearchParams({ track, artist, wait: '15' })}`, { headers }, 20_000);
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  const id = typeof payload === 'object' && payload && 'itunes_track_id' in payload ? String(payload.itunes_track_id) : null;
  // FreqBlog answers the artwork request with a redirect to the image itself.
  const artwork = id ? await fetchWithTimeout(`${baseUrl}/track/${encodeURIComponent(id)}/artwork?size=600`, { headers, redirect: 'manual' }, 10_000).catch(() => null) : null;
  const location = artwork && artwork.status >= 300 && artwork.status < 400 ? artwork.headers.get('location') : null;
  return readTrackDetails(payload, location ? new URL(location, baseUrl).toString() : null);
}

export const lookupTrackDetails = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ track: z.string().trim().min(1).max(200), artist: z.string().trim().min(1).max(200) }).strict().parse(input))
  .handler(async ({ data }): Promise<{ track: TrackDetails | null }> => {
    const apiKey = process.env['FREQBLOG_API_KEY'];
    // No key yet: the look keeps its typographic card.
    if (!apiKey) return { track: null };
    const baseUrl = (process.env['FREQBLOG_API_URL'] || 'https://api.freqblog.com').replace(/\/$/, '');
    const id = `${data.track}|${data.artist}`.toLowerCase();
    if (!cache.has(id)) {
      // Only found tracks stay cached, so a miss or outage is retried on the next look.
      cache.set(id, lookup(baseUrl, apiKey, data.track, data.artist)
        .catch(failure => { console.error('[FreqBlog] lookup failed', failure instanceof Error ? failure.message : failure); return null; })
        .then(result => { if (!result) cache.delete(id); return result; }));
    }
    return { track: await cache.get(id)! };
  });
