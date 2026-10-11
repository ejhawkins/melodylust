import { describe, it, expect } from 'vitest';
import { readFreqblogArtists, primaryArtist, searchMockArtists } from './artist-provider';
describe('FreqBlog artist mapping', () => {
  it('groups primary artists and preserves provenance from documented track stubs', () => {
    const result = readFreqblogArtists({ q: 'ush', count: 3, results: [
      { itunes_track_id: '1', track_name: 'Yeah!', artist_name: 'Usher feat. Lil Jon', genre: 'R&B', release_date: '2004-01-01' },
      { itunes_track_id: '2', track_name: 'OMG', artist_name: 'Usher', genre: 'Pop' },
      { itunes_track_id: '3', track_name: 'Usher', artist_name: 'Other Artist', album_name: 'Usher' },
    ] }, 'ush', '2026-10-11');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'freqblog:Usher', sourceId: 'Usher', imageUrl: null, genres: ['R&B', 'Pop'], disambiguation: '“Yeah!” (2004)', provenance: { endpoint: 'GET /search', query: 'ush', fetchedAt: '2026-10-11', itunesTrackIds: ['1', '2'] } });
  });
  it('handles absent fields and does not split duos', () => {
    expect(readFreqblogArtists(null, 'ab', '')).toEqual([]);
    expect(readFreqblogArtists({ results: [{ artist_name: 'Ab' }, {}] }, 'ab', '')).toEqual([]);
    expect(primaryArtist('Simon & Garfunkel')).toBe('Simon & Garfunkel');
  });
  it('offers two separately identified mock artists with the same name', () => {
    expect(searchMockArtists('ve')).toHaveLength(2);
    expect(searchMockArtists('zzqx')).toEqual([]);
  });
});
