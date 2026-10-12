import { describe, expect, it, vi } from 'vitest';
import { runArtistStyleSearch } from './artist-style-search.server';
import { artistStyleSearchSchema, recommendArtistLooks, type TrackedStyleSearchResponse } from './artist-style';
import type { ArtistSearchResponse, ArtistSuggestion } from './artist-search';
import { emptyStyleProfile } from './style-profile';

const suggestion = (name = 'Test Artist', genres = ['Rock']): ArtistSuggestion => ({ id: 'freqblog:test', name, source: 'freqblog', sourceId: name, disambiguation: null, imageUrl: null, genres, provenance: null });
const empty: TrackedStyleSearchResponse = { result: { intent: { music_name: 'Test Artist', music_kind: 'artist', designer_name: null }, music: null, associations: [], missingDesigner: false }, articles: [], interpretation: 'directory', error: '' };
const setup = (results: ArtistSuggestion[] = [suggestion()]) => ({
  lookupArtists: vi.fn<() => Promise<ArtistSearchResponse>>().mockResolvedValue({ status: 'ok', results, database: 'ok', provider: 'ok' }),
  readEvidence: vi.fn<() => Promise<TrackedStyleSearchResponse>>().mockResolvedValue(empty),
});

describe('directory → evidence → outfit result', () => {
  it('produces an explainable outfit for a verified artist without any articles', async () => {
    const deps = setup();
    const result = await runArtistStyleSearch({ query: 'Test Artist' }, deps);
    expect(result.artistResolution).toBe('verified');
    expect(result.recommendation?.artist.genres).toEqual(['Rock']);
    expect(result.recommendation?.looks[0]?.id).toBe('utility');
    expect(result.recommendation?.looks[0]?.pieces).toHaveLength(4);
    expect(result.recommendation?.looks[0]?.reasons).toContainEqual({ kind: 'music', text: 'Music directory genre: Rock. Matched to an editorial outfit rule.' });
    expect(result.articles).toEqual([]);
    expect(deps.readEvidence).toHaveBeenCalledWith('Test Artist', 'Test Artist', false);
  });
  it('rechecks the selected ID instead of trusting client artist facts', async () => {
    const deps = setup();
    const result = await runArtistStyleSearch({ query: 'Test Artist', artist: { id: 'forged', name: 'Test Artist', source: 'freqblog' } }, deps);
    expect(result.artistResolution).toBe('selection_unverified');
    expect(result.recommendation).toBeNull();
    expect(deps.readEvidence).not.toHaveBeenCalled();
    expect(() => artistStyleSearchSchema.parse({ query: 'Test Artist', artist: { id: 'freqblog:test', name: 'Test Artist', source: 'freqblog', genres: ['Fake'] } })).toThrow();
  });
  it('requires selection for same-name artists and avoids name-only fashion attribution', async () => {
    const first = suggestion();
    const deps = setup([first, { ...first, id: 'melodylust:other', source: 'melodylust', genres: ['Jazz'] }]);
    const ambiguous = await runArtistStyleSearch({ query: 'Test Artist' }, deps);
    expect(ambiguous.artistResolution).toBe('ambiguous');
    expect(ambiguous.recommendation).toBeNull();
    expect(deps.readEvidence).not.toHaveBeenCalled();
    const selected = await runArtistStyleSearch({ query: 'Test Artist', artist: { id: first.id, name: first.name, source: first.source } }, deps);
    expect(selected.recommendation?.looks[0]?.id).toBe('utility');
    expect(selected.articles).toEqual([]);
    expect(selected.warning).toContain('name-only articles');
  });
  it('does not identify different non-Latin names as the same artist', async () => {
    const deps = setup([suggestion('宇多田ヒカル')]);
    const result = await runArtistStyleSearch({ query: '周杰倫' }, deps);
    expect(result.recommendation).toBeNull();
  });
  it('returns a music-based outfit with an explicit warning if article indexing fails', async () => {
    const deps = setup();
    deps.readEvidence.mockResolvedValue({ ...empty, result: null, error: 'Article index unavailable.' });
    const result = await runArtistStyleSearch({ query: 'Test Artist' }, deps);
    expect(result.recommendation?.looks).toHaveLength(3);
    expect(result.warning).toContain('Article index unavailable');
    expect(result.articles).toEqual([]);
  });
  it('does not make up an artist or outfit for an unknown name or directory failure', async () => {
    const deps = setup([]);
    expect((await runArtistStyleSearch({ query: 'No Such Artist' }, deps)).recommendation).toBeNull();
    deps.lookupArtists.mockResolvedValue({ status: 'error', results: [], database: 'unavailable', provider: 'unavailable' });
    const result = await runArtistStyleSearch({ query: 'No Such Artist' }, deps);
    expect(result.recommendation).toBeNull();
    expect(result.warning).toContain('directory is unavailable');
  });
  it('can use a literal article artist without inventing a genre during an outage', async () => {
    const deps = setup([]);
    deps.lookupArtists.mockRejectedValue(new Error('offline'));
    deps.readEvidence.mockResolvedValue({ ...empty, result: { ...empty.result!, music: { id: 'artist:test', kind: 'artist', name: 'Test Artist' } }, articles: [{ id: 'a1', url: 'https://example.org/article', title: 'Test Artist interview', publication: 'Test', published_at: '2026-10-11', summary: 'Test Artist talks about touring.', categories: [], entity_ids: ['artist:test'] }] });
    const result = await runArtistStyleSearch({ query: 'Test Artist' }, deps);
    expect(result.recommendation?.artist.source).toBe('article');
    expect(result.recommendation?.artist.genres).toEqual([]);
    expect(result.recommendation?.looks[0]?.reasons[0]?.kind).toBe('baseline');
  });
  it('keeps song queries separate from an artist of the same name', async () => {
    const deps = setup();
    deps.readEvidence.mockResolvedValue({ ...empty, result: { ...empty.result!, intent: { music_name: 'Test Artist', music_kind: 'song', designer_name: null } } });
    const result = await runArtistStyleSearch({ query: 'Test Artist' }, deps);
    expect(result.result?.intent.music_kind).toBe('song');
    expect(result.recommendation).toBeNull();
  });
});

describe('outfit ranking', () => {
  const artist = { id: 'test', name: 'Test Artist', source: 'freqblog' as const, genres: ['Pop'] };
  it('uses literal garment mentions and quiz preferences with traceable reasons', () => {
    const profile = { ...emptyStyleProfile(), item: ['Blazer'], occasion: ['Work'], material: ['Tweed'], color: ['Burgundy'] };
    const articles = [{ id: 'a1', url: 'https://example.org/test', title: 'A show review', publication: 'Test', published_at: '2026-10-11', summary: 'The show features a blazer.', categories: [], entity_ids: [] }];
    const result = recommendArtistLooks(artist, articles, profile);
    expect(result.looks[0]?.id).toBe('tailored');
    expect(result.looks[0]?.reasons).toContainEqual({ kind: 'article', text: 'Article mentions blazer: A show review', articleId: 'a1' });
    expect(result.looks[0]?.reasons.some(reason => reason.kind === 'profile')).toBe(true);
    expect(result.looks[0]?.pieces[0]?.detail).toContain('Burgundy');
    expect(result).toEqual(recommendArtistLooks(artist, articles, profile));
  });
  it('does not infer a genre, designer, clothing ownership or audio metrics from a name', () => {
    const result = recommendArtistLooks({ ...artist, name: 'Usher', genres: [] }, []);
    expect(result.looks[0]?.id).toBe('everyday');
    expect(result.looks.flatMap(look => look.reasons).every(reason => reason.kind === 'baseline')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/Off-White|BPM|wore|owns|affinity/);
  });
});
