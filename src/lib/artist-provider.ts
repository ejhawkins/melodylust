// External artist providers: the payload → suggestion mappings and the labelled mock data.
// Pure and credential-free (network calls live in artist-provider.server.ts) so the mapping
// is tested against the documented response before relying on live data.

import { normalizeArtistName, type ArtistSuggestion } from './artist-search';

// ── FreqBlog (verified: GET https://api.freqblog.com/search, OpenAPI "Music Metadata API" 1.5.0) ──
// /search returns track stubs, not artists: {q, count, results: [{itunes_track_id, track_name,
// artist_name, album_name?, genre?, release_date?, …}]}. FreqBlog has no artist ID or image, so
// an artist is identified by FreqBlog's own artist-name string, kept verbatim as source_id.
// Terms §6.1: paid plans may cache and display returned values in-app; credit "Audio analysis
// by FreqBlog"; no redistribution as an API, feed, export or dataset.

export const FREQBLOG_ATTRIBUTION = 'Audio analysis by FreqBlog';

type FreqblogTrackStub = { itunes_track_id?: unknown; track_name?: unknown; artist_name?: unknown; genre?: unknown; release_date?: unknown };

/** "Usher feat. Lil Jon & Ludacris" → "Usher". Duos written with "&" are kept whole. */
export const primaryArtist = (name: string) => name.split(/\s+(?:feat\.?|featuring|ft\.?|with)\s+/i)[0]!.trim();

/** Every typed word must start a word of the artist's name ("ush" → Usher; "yeah" ≠ Usher). */
export function nameMatchesQuery(name: string, query: string) {
  const words = normalizeArtistName(name).split(' ');
  return normalizeArtistName(query).split(' ').filter(Boolean).every(token => words.some(word => word.startsWith(token)));
}

/** FreqBlog track stubs → one suggestion per artist, with genre and a sample track to tell same-name artists apart. */
export function readFreqblogArtists(payload: unknown, query: string, fetchedAt: string): ArtistSuggestion[] {
  const results = payload && typeof payload === 'object' && 'results' in payload && Array.isArray(payload.results) ? payload.results as FreqblogTrackStub[] : [];
  const byArtist = new Map<string, { name: string; genres: string[]; tracks: { id: string; title: string; year: string | null }[] }>();
  for (const stub of results) {
    if (typeof stub.artist_name !== 'string' || typeof stub.itunes_track_id !== 'string' || typeof stub.track_name !== 'string') continue;
    const name = primaryArtist(stub.artist_name);
    if (!name || !nameMatchesQuery(name, query)) continue;
    const key = normalizeArtistName(name);
    const entry = byArtist.get(key) ?? { name, genres: [], tracks: [] };
    if (typeof stub.genre === 'string' && stub.genre && !entry.genres.includes(stub.genre)) entry.genres.push(stub.genre);
    const year = typeof stub.release_date === 'string' ? stub.release_date.slice(0, 4) : null;
    entry.tracks.push({ id: stub.itunes_track_id, title: stub.track_name, year: year && /^\d{4}$/.test(year) ? year : null });
    byArtist.set(key, entry);
  }
  return [...byArtist.values()].map(({ name, genres, tracks }) => {
    const sample = tracks[0]!;
    return {
      id: `freqblog:${encodeURIComponent(name)}`,
      name,
      source: 'freqblog' as const,
      sourceId: name,
      disambiguation: `“${sample.title}”${sample.year ? ` (${sample.year})` : ''}`,
      genres: genres.slice(0, 2),
      imageUrl: null,
      provenance: { provider: 'freqblog', endpoint: 'GET /search', query, fetchedAt, itunesTrackIds: tracks.map(track => track.id).slice(0, 10), attribution: FREQBLOG_ATTRIBUTION },
    };
  });
}

// ── Mock provider: SAMPLE DATA ONLY ──────────────────────────────────────────
// Fictional artists for building and testing the flow before a live provider is connected.
// Active only when ARTIST_PROVIDER=mock; every record is labelled as mock in the interface.

export const MOCK_ARTISTS: ArtistSuggestion[] = [
  { name: 'Velvet Static', genres: ['Dream pop'] },
  { name: 'Velvet Static', genres: ['Hardcore punk'] },
  { name: 'Marigold Avenue', genres: ['R&B'] },
  { name: 'Neon Atelier', genres: ['Electronic'] },
].map((artist, index) => ({
  id: `mock:${index + 1}`,
  name: artist.name,
  source: 'mock' as const,
  sourceId: String(index + 1),
  disambiguation: 'Mock data, not a real artist',
  genres: artist.genres,
  imageUrl: null,
  provenance: { provider: 'mock' },
}));

export const searchMockArtists = (query: string) => MOCK_ARTISTS.filter(artist => nameMatchesQuery(artist.name, query));
