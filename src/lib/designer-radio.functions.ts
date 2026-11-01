import { createServerFn } from '@tanstack/react-start';
import { commonsPhotosUrl, knownDesigner, portraitDesigners, readCommonsPhotos, readWikipediaPages, wikipediaPagesUrl } from './designer-portraits';
import { designerRadioSongs, rowDirectors, type DesignerRadioRow } from './designer-radio';
import type { Designer, RunwaySong } from './runway-songs';

export type DesignerRadio = { songs: RunwaySong[]; connected: boolean };

// Portraits change rarely; a day per server instance keeps Wikipedia off most page loads.
const portraitCache = new Map<string, { designer: Designer; until: number }>();
const DAY = 24 * 60 * 60 * 1000;

const readJson = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(4_000), headers: { 'user-agent': 'RunwaySongs/1.0 (designer portraits)' } });
  return response.ok ? response.json() as Promise<unknown> : null;
};

/** Wikipedia articles and Commons photos for directors outside the curated list; a failed lookup leaves them unpictured, never throws. */
async function lookUpPortraits(names: string[]) {
  const now = Date.now();
  const missing = names.filter(name => !knownDesigner(name) && (portraitCache.get(name)?.until ?? 0) <= now).slice(0, 50);
  if (missing.length) {
    try {
      const pages = readWikipediaPages(await readJson(wikipediaPagesUrl(missing)), missing);
      const files = [...new Set([...pages.values()].flatMap(page => page.file ? [page.file] : []))];
      const photos = readCommonsPhotos(files.length ? await readJson(commonsPhotosUrl(files)) : null);
      portraitDesigners(missing, pages, photos).forEach((designer, k) => portraitCache.set(missing[k]!, { designer, until: now + DAY }));
    } catch (error) {
      console.error('[Designer radio] portrait lookup failed', error instanceof Error ? error.message : error);
    }
  }
  return new Map(names.flatMap(name => {
    const cached = portraitCache.get(name);
    return cached ? [[name, cached.designer] as const] : [];
  }));
}

export const getDesignerRadio = createServerFn({ method: 'GET' }).handler(async (): Promise<DesignerRadio> => {
  const { getDb } = await import('./db.server');
  const db = getDb();
  if (!db) return { songs: [], connected: false };

  const { data, error } = await db
    .from('runway_song_candidates')
    .select('id,title,artist,category,show_name,show_season,spotify_url,status,provenance,designer:designers!inner(name)')
    .eq('status', 'approved')
    .not('spotify_url', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Designer radio] could not load approved tracks', error.message);
    return { songs: [], connected: true };
  }

  const rows = (data ?? []) as unknown as DesignerRadioRow[];
  return { songs: designerRadioSongs(rows, await lookUpPortraits(rowDirectors(rows))), connected: true };
});
