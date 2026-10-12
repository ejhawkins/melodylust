import { createServerFn } from '@tanstack/react-start';
import {
  artistQuerySchema, MAX_SUGGESTIONS, normalizeArtistName, submissionInputSchema,
  type ArtistSearchResponse, type ArtistSource, type ArtistSuggestion, type SubmissionResponse,
} from './artist-search';
import { createRateLimiter } from './rate-limit';
import { clientKey } from './client-key.server';

// Per server instance; see rate-limit.ts for the limits of in-memory limiting.
const searchLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const submitLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });

type ArtistRow = { id: string; name: string; disambiguation: string | null; genres: string[] | null; image_url: string | null; source: string; source_id: string | null };

const toSuggestion = (row: ArtistRow): ArtistSuggestion => ({
  id: row.id, name: row.name,
  source: (['melodylust', 'freqblog'] as const).includes(row.source as 'freqblog') ? row.source as ArtistSource : 'melodylust',
  sourceId: row.source_id, disambiguation: row.disambiguation, genres: row.genres ?? [], imageUrl: row.image_url, provenance: null,
});

/** Autocomplete: approved MelodyLust artists first, then the external provider. */
export const searchArtists = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => artistQuerySchema.parse(input))
  .handler(async ({ data }): Promise<ArtistSearchResponse> => {
    const { getDb } = await import('./db.server');
    const { searchProvider } = await import('./artist-provider.server');
    if (!searchLimiter.allow(await clientKey())) return { status: 'rate_limited', results: [], database: 'ok', provider: 'ok' };

    // Normalized names only contain a-z, 0-9 and spaces, so they're safe inside the filter.
    const wanted = normalizeArtistName(data.query);
    const database = (async () => {
      const db = getDb();
      if (!db || !wanted) return { ok: Boolean(db), rows: [] as ArtistRow[] };
      const { data: rows, error } = await db.from('artists')
        .select('id,name,disambiguation,genres,image_url,source,source_id')
        .eq('status', 'approved')
        .or(`normalized_name.like.${wanted}*,normalized_name.like.* ${wanted}*`)
        .limit(MAX_SUGGESTIONS);
      if (error) throw new Error(error.message);
      return { ok: true, rows: (rows ?? []) as ArtistRow[] };
    })().catch(failure => { console.error('[Artists] database search failed', failure instanceof Error ? failure.message : failure); return { ok: false, rows: [] as ArtistRow[] }; });

    const [db, provider] = await Promise.all([database, searchProvider(data.query)]);
    const { mergeSuggestions } = await import('./artist-search');
    const providerDown = provider.status === 'unavailable' || provider.status === 'not_configured';
    // Only a total outage is an error; one healthy source still answers.
    if (!db.ok && providerDown) return { status: 'error', results: [], database: 'unavailable', provider: provider.status };
    return { status: 'ok', results: mergeSuggestions(data.query, db.rows.map(toSuggestion), provider.results), database: db.ok ? 'ok' : 'unavailable', provider: provider.status };
  });

/** Saves a reader's artist suggestion as pending review. Never adds to approved artists. */
export const submitArtist = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => submissionInputSchema.parse(input))
  .handler(async ({ data }): Promise<SubmissionResponse> => {
    const key = await clientKey();
    if (!submitLimiter.allow(key)) return { status: 'rate_limited' };
    const { getDb } = await import('./db.server');
    const { submitArtistWith } = await import('./artist-submit.server');
    return submitArtistWith(getDb(), data, key, Date.now());
  });
