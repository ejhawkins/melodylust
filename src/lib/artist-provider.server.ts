// Server-only artist provider calls. Credentials are read here, never sent to the browser.
// ARTIST_PROVIDER chooses the external source: "freqblog" (needs FREQBLOG_API_KEY on a plan
// that allows caching/display — Hobbyist or above), "mock" (labelled sample data), or unset.

import { readFreqblogArtists, searchMockArtists } from './artist-provider';
import type { ArtistSuggestion, ProviderStatus } from './artist-search';

export class ProviderUnavailableError extends Error {}

export type ProviderResult = { status: ProviderStatus; results: ArtistSuggestion[] };

async function searchFreqblog(apiKey: string, query: string, signal: AbortSignal): Promise<ArtistSuggestion[]> {
  const url = `https://api.freqblog.com/search?${new URLSearchParams({ q: query, limit: '25' })}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' }, signal });
  } catch (failure) {
    throw new ProviderUnavailableError(failure instanceof Error ? failure.message : 'network error');
  }
  // 401 (key), 429 (quota) and 5xx all mean "provider unavailable" to the reader; the
  // status is logged server-side so the cause is visible without exposing it.
  if (!response.ok) throw new ProviderUnavailableError(`FreqBlog /search returned ${response.status}`);
  return readFreqblogArtists(await response.json(), query, new Date().toISOString());
}

/** Searches the configured external provider. Never throws: failures become `unavailable`. */
export async function searchProvider(query: string, timeoutMs = 4_000): Promise<ProviderResult> {
  const choice = (process.env['ARTIST_PROVIDER'] ?? '').trim().toLowerCase();
  if (choice === 'mock') return { status: 'mock', results: searchMockArtists(query) };
  if (choice !== 'freqblog') return { status: 'not_configured', results: [] };
  const apiKey = process.env['FREQBLOG_API_KEY'];
  if (!apiKey) return { status: 'not_configured', results: [] };
  try {
    return { status: 'ok', results: await searchFreqblog(apiKey, query, AbortSignal.timeout(timeoutMs)) };
  } catch (failure) {
    console.error('[Artists] provider unavailable', failure instanceof Error ? failure.message : failure);
    return { status: 'unavailable', results: [] };
  }
}
