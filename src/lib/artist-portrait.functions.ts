import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { pickPortraitPage, portraitCandidates, readPortraitImage, type ArtistPortrait } from './artist-portrait';

// Wikimedia asks API clients to identify themselves.
const HEADERS = { 'User-Agent': 'MelodyLust/0.1 (independent fashion journal)', Accept: 'application/json' };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// One answer per artist name for a week (including "no free photo"), so repeat searches cost nothing.
const cache = new Map<string, { at: number; portrait: Promise<ArtistPortrait | null> }>();

async function wikipedia(params: Record<string, string>) {
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '1', ...params })}`, { headers: HEADERS, signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error(`Wikipedia API returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function findPortrait(name: string): Promise<ArtistPortrait | null> {
  const candidates = portraitCandidates(name);
  // One request checks every candidate title: does it exist, is it about a musician, and
  // does it have a freely licensed lead image (pilicense=free never returns fair-use files)?
  const page = pickPortraitPage(await wikipedia({
    action: 'query', titles: candidates.join('|'), redirects: '1',
    prop: 'description|pageimages|pageprops', piprop: 'name', pilicense: 'free', ppprop: 'disambiguation',
  }), candidates);
  if (!page) return null;
  // Commons files are visible through Wikipedia's API; ask for a 320px copy plus its licence.
  return readPortraitImage(await wikipedia({
    action: 'query', titles: `File:${page.file}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '320',
  }), name);
}

/** The searched artist's free-licence Wikipedia portrait for the cursor, or null to keep the default. */
export const lookupArtistPortrait = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(120) }).strict().parse(input))
  .handler(async ({ data }): Promise<{ portrait: ArtistPortrait | null }> => {
    const key = data.name.toLowerCase();
    const saved = cache.get(key);
    if (!saved || Date.now() - saved.at > WEEK_MS) {
      cache.set(key, {
        at: Date.now(),
        portrait: findPortrait(data.name).catch(failure => {
          // A failure isn't remembered, so the next search tries again.
          console.error('[Portrait] lookup failed', failure instanceof Error ? failure.message : failure);
          cache.delete(key);
          return null;
        }),
      });
    }
    return { portrait: await cache.get(key)!.portrait };
  });
