// Pure, browser-safe helpers for turning a FreqBlog track lookup into the small
// shape the look thumbnail uses. Kept apart from the server function so the
// mapping can be unit-tested without a key.

import { z } from 'zod';

const lookupSchema = z.object({
  track_name: z.string(),
  artist_name: z.string(),
  album_name: z.string().nullable().optional(),
  itunes_track_id: z.string(),
  bpm: z.number().nullable().optional(),
  key: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
}).passthrough();

export type TrackDetails = {
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  bpm: number | null;
  key: string | null;
  mood: string | null;
};

const httpsOnly = (url: string | null | undefined) => {
  try { return url && new URL(url).protocol === 'https:' ? url : null; } catch { return null; }
};

/** FreqBlog lookup payload + artwork redirect target → thumbnail details, or null if the payload is unusable. */
export function readTrackDetails(payload: unknown, artworkUrl?: string | null): TrackDetails | null {
  const parsed = lookupSchema.safeParse(payload);
  if (!parsed.success) return null;
  const track = parsed.data;
  return {
    title: track.track_name,
    artist: track.artist_name,
    album: track.album_name || null,
    artworkUrl: httpsOnly(artworkUrl),
    bpm: typeof track.bpm === 'number' && track.bpm > 0 ? Math.round(track.bpm) : null,
    // FreqBlog writes keys as "C-Major"; the card reads better as "C major".
    key: track.key ? track.key.replace(/-(major|minor)$/i, (_, mode: string) => ` ${mode.toLowerCase()}`) : null,
    mood: track.mood || null,
  };
}

/** "105 BPM · F minor", skipping whatever FreqBlog didn't return. */
export const trackStats = (track: TrackDetails) => [track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(' · ');

/** One of an artist's songs from FreqBlog's catalogue, as the artist search shows it. */
export type ArtistSong = { title: string; album: string | null; year: string | null; genre: string | null; spotifyUrl: string };

/** Same song however it was released: case, "(Remastered)" / "- Single Version" and extra spacing ignored. */
const songKey = (title: string) => title.toLowerCase().replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s+-\s+.*$/, '').replace(/\s+/g, ' ').trim();

/** /artist/tracks payload → the artist's most popular distinct songs. Only tracks credited to this
 *  artist count; a song on several releases (album, deluxe, compilation) appears once. */
export function readArtistSongs(payload: unknown, artist: string, limit = 3): ArtistSong[] {
  const tracks = payload && typeof payload === 'object' && 'tracks' in payload && Array.isArray(payload.tracks) ? payload.tracks as Record<string, unknown>[] : [];
  const wanted = artist.trim().toLowerCase();
  const seen = new Set<string>();
  return tracks
    .filter(track => typeof track['track_name'] === 'string' && typeof track['artist_name'] === 'string' && track['artist_name'].toLowerCase().split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bwith\b|\bx\b)\s*/)[0] === wanted)
    .map((track, index) => ({ track, index, popularity: typeof track['popularity'] === 'number' ? track['popularity'] : 0 }))
    .sort((a, b) => b.popularity - a.popularity || a.index - b.index)
    .flatMap(({ track }) => {
      const title = String(track['track_name']).trim();
      const key = songKey(title);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      const date = typeof track['release_date'] === 'string' ? track['release_date'] : '';
      return [{
        title,
        album: typeof track['album_name'] === 'string' && track['album_name'] ? track['album_name'] : null,
        year: /^\d{4}/.test(date) ? date.slice(0, 4) : null,
        genre: typeof track['genre'] === 'string' && track['genre'] ? track['genre'] : null,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${title} ${String(track['artist_name'])}`)}`,
      }];
    })
    .slice(0, limit);
}
