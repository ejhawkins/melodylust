// Pure helpers for finding an album's original sleeve. MusicBrainz groups every
// pressing, reissue and region of an album into one "release group"; the Cover
// Art Archive keeps that group's canonical front cover. Matching on the album
// (not the track) is what keeps compilations like "Greatest Hits 2008" out.

import { foldName } from './song-recommendations';

type ReleaseGroup = {
  id?: unknown;
  title?: unknown;
  'primary-type'?: unknown;
  'secondary-types'?: unknown;
  'artist-credit'?: unknown;
};

const creditNames = (credit: unknown) =>
  Array.isArray(credit) ? credit.flatMap(entry => (entry && typeof entry === 'object' && 'name' in entry && typeof entry.name === 'string' ? [entry.name] : [])) : [];

/** MusicBrainz release-group search → the original studio album's cover URL, or null. */
export function pickAlbumCover(payload: unknown, album: string, artist: string, size: 250 | 500 = 250): string | null {
  const groups: ReleaseGroup[] = payload && typeof payload === 'object' && 'release-groups' in payload && Array.isArray(payload['release-groups']) ? payload['release-groups'] : [];
  const match = groups.find(group =>
    typeof group.id === 'string' && /^[0-9a-f-]{36}$/.test(group.id)
    && typeof group.title === 'string' && foldName(group.title) === foldName(album)
    && group['primary-type'] === 'Album'
    // Compilations, live albums and remix albums carry secondary types; the original doesn't.
    && (!Array.isArray(group['secondary-types']) || group['secondary-types'].length === 0)
    && creditNames(group['artist-credit']).some(name => foldName(name) === foldName(artist)));
  return match ? `https://coverartarchive.org/release-group/${match.id}/front-${size}` : null;
}

/** Lucene query for one album by one artist. Quotes and backslashes are escaped. */
export const albumQuery = (album: string, artist: string) => {
  const quote = (value: string) => `"${value.replace(/["\\]/g, '\\$&')}"`;
  return `releasegroup:${quote(album)} AND artist:${quote(artist)} AND primarytype:album`;
};
