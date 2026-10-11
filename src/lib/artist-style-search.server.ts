/** One orchestration seam for directory identity, approved articles and outfit ranking. */
import { type ArtistSearchResponse, type ArtistSuggestion } from './artist-search';
import { recommendArtistLooks, type ArtistStyleSearchInput, type ArtistResolution, type ResolvedStyleArtist, type TrackedStyleSearchResponse } from './artist-style';

type Dependencies = {
  lookupArtists(query: string): Promise<ArtistSearchResponse>;
  readEvidence(query: string, artistName?: string, selected?: boolean): Promise<TrackedStyleSearchResponse>;
};
const exactName = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const same = (a: string, b: string) => Boolean(exactName(a)) && exactName(a) === exactName(b);

export async function runArtistStyleSearch(input: ArtistStyleSearchInput, deps: Dependencies): Promise<TrackedStyleSearchResponse> {
  let artist: ResolvedStyleArtist | null = null;
  let resolution: ArtistResolution = 'not_found';
  let collision = false;
  let matches: ArtistSuggestion[] = [];
  if (input.query.length <= 80) {
    try {
      const directory = await deps.lookupArtists(input.query);
      if (directory.status !== 'ok' || directory.provider === 'unavailable' || directory.database === 'unavailable' || directory.provider === 'not_configured') resolution = 'unavailable';
      matches = directory.results.filter(candidate => same(candidate.name, input.query));
      const selected = input.artist;
      const match = selected
        ? matches.find(candidate => candidate.id === selected.id && candidate.source === selected.source && same(candidate.name, selected.name))
        : matches.length === 1 ? matches[0] : undefined;
      collision = matches.length > 1;
      if (match) { artist = { id: match.id, name: match.name, source: match.source, genres: match.genres }; resolution = 'verified'; }
      else if (selected) resolution = 'selection_unverified';
      else if (collision) resolution = 'ambiguous';
    } catch { resolution = input.artist ? 'selection_unverified' : 'unavailable'; }
  }
  // Selected names are only sent into evidence after directory re-verification.
  // Same-name artists cannot safely inherit name-only article associations.
  const evidence = collision || (input.artist && !artist)
    ? { result: null, articles: [], interpretation: 'literal', error: '' }
    : await deps.readEvidence(input.query, artist?.name, Boolean(input.artist)).catch(() => ({ result: null, articles: [], interpretation: 'literal', error: 'The article collection is unavailable right now.' }));
  if (!input.artist && !artist && !collision && evidence.result?.music?.kind === 'artist' && same(evidence.result.music.name, input.query) && evidence.articles.length) {
    const music = evidence.result.music;
    artist = { id: `article:${music.id}`, name: music.name, source: 'article', genres: [] };
    resolution = 'verified';
  }
  // A literal song/genre query retains its evidence level even if a directory artist shares its name.
  if (!input.artist && evidence.result?.intent.music_kind !== 'artist' && evidence.result) artist = null;
  let warning = '';
  if (collision) warning = artist ? 'Several artists share this name. This outfit uses your selected music record; name-only articles are not attached.' : 'Several artists share this name. Choose an artist suggestion before searching.';
  else if (resolution === 'selection_unverified') warning = 'We could not verify the selected artist. Try the directory again; no artist-specific outfit was generated.';
  else if (artist?.source === 'article') warning = 'Artist found in the article collection. Music directory metadata is unavailable or has no exact match.';
  else if (!artist && resolution === 'unavailable') warning = 'The artist directory is unavailable or incomplete. Try again to verify an artist.';
  else if (!artist && (!evidence.result || evidence.result.intent.music_kind === 'artist')) warning = 'No verified artist match. Check the name or choose an artist suggestion.';
  if (artist && evidence.error) warning = `${warning} ${evidence.error} This outfit uses music metadata and your preferences only.`.trim();
  return { ...evidence, artistResolution: resolution, warning, recommendation: artist ? recommendArtistLooks(artist, evidence.articles, input.profile) : null };
}
