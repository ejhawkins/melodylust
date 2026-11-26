// Spotify's Developer Policy forbids using the Spotify Platform or Spotify Content to train or ingest into an
// AI/ML model. Nothing from Spotify may be embedded, stored for retrieval, or put into a prompt. This guard
// is the runtime half of that rule: it runs on every payload headed for the embedding model or the stylist
// model and refuses one that carries a Spotify link, URI or asset. The static half is
// src/lib/ai-input-guard.test.ts, which fails if an AI path imports any Spotify module.
//
// Songs reach the stylist only as titles from FreqBlog or the hand-written catalog. A song is tied to
// Spotify by its ID in the player, never by sending Spotify's data to a model.

// Built from pieces so this file doesn't itself contain the hostnames the import-graph test looks for.
const SPOTIFY_PATTERNS = [
  new RegExp(String.raw`(?:^|[^\w.-])(?:[\w-]+\.)*spotify` + String.raw`\.(?:com|link)\b`, 'i'),
  new RegExp(String.raw`(?:^|[^\w.-])(?:[\w-]+\.)*scdn` + String.raw`\.co\b`, 'i'),
  /\bspotify:(?:track|album|artist|playlist|episode|show|user):/i,
];

/** The first string in `value` (searched deeply) that carries Spotify content, or null. */
export function findSpotifyContent(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === 'string') return SPOTIFY_PATTERNS.some(pattern => pattern.test(value)) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) { const hit = findSpotifyContent(item, depth + 1); if (hit) return hit; }
    return null;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) { const hit = findSpotifyContent(item, depth + 1); if (hit) return hit; }
  }
  return null;
}

export class SpotifyContentError extends Error {}

/** Throws before anything Spotify-sourced reaches an embedding or a prompt. The message names where, never the content. */
export function assertNoSpotifyContent(value: unknown, where: string) {
  if (findSpotifyContent(value)) throw new SpotifyContentError(`Spotify content can't be sent to ${where} (Spotify Developer Policy).`);
}
