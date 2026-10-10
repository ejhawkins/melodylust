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
    key: track.key || null,
    mood: track.mood || null,
  };
}

/** "105 BPM · F minor", skipping whatever FreqBlog didn't return. */
export const trackStats = (track: TrackDetails) => [track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(' · ');
