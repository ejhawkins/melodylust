import { useEffect, useState } from "react";

// Album art for any song with a Spotify track, from Spotify's public oEmbed (no key, open to the browser). Found covers are
// kept on this device so each one is asked for once; a song Spotify doesn't know keeps whatever the page shows instead.

const CACHE_KEY = "ml-album-art";
const memory = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

/** The Spotify track id in an open.spotify.com track link, or null. */
export const spotifyTrackId = (link: string | null | undefined) => /open\.spotify\.com\/track\/([A-Za-z0-9]{22})/.exec(link ?? "")?.[1] ?? null;

/** The cover in an oEmbed reply, as a 300px Spotify image, or null when there is none. */
export function coverFromOEmbed(reply: unknown): string | null {
  const url = (reply as { thumbnail_url?: unknown } | null)?.thumbnail_url;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
}

function stored(): Record<string, string> {
  try { const value: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}"); return value && typeof value === "object" ? value as Record<string, string> : {}; } catch { return {}; }
}
function remember(id: string, url: string) {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...stored(), [id]: url })); } catch { /* storage unavailable */ }
}

/** The cover for a Spotify track id: from memory, then this device, then Spotify. */
export function albumArt(id: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (memory.has(id)) return Promise.resolve(memory.get(id) ?? null);
  const saved = typeof window === "undefined" ? undefined : stored()[id];
  if (saved) { memory.set(id, saved); return Promise.resolve(saved); }
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;
  const ask = fetcher(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`)
    .then(response => (response.ok ? response.json() : null))
    .then(coverFromOEmbed)
    .catch(() => null)
    .then(url => { memory.set(id, url); pending.delete(id); if (url && typeof window !== "undefined") remember(id, url); return url; });
  pending.set(id, ask);
  return ask;
}

/** The cover for a Spotify track id, once it is known; null before then and for no id. */
export function useAlbumArt(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? memory.get(id) ?? null : null));
  useEffect(() => {
    if (!id) { setUrl(null); return; }
    let live = true;
    setUrl(memory.get(id) ?? null);
    void albumArt(id).then(found => { if (live) setUrl(found); });
    return () => { live = false; };
  }, [id]);
  return url;
}
