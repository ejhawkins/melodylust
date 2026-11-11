import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Reads a public Spotify track's artist from its embed page (no API key); oEmbed gives only the title. */
export const getSpotifyArtist = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().regex(/^[A-Za-z0-9]{22}$/) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const r = await fetch(`https://open.spotify.com/embed/track/${data.id}`, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) return { artist: null as string | null };
      const html = await r.text();
      const block = html.match(/"artists":\[(.*?)\]/)?.[1] ?? "";
      const names = [...block.matchAll(/"name":"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse(`"${m[1]}"`) as string);
      return { artist: names.length ? names.join(", ") : null };
    } catch { return { artist: null as string | null }; }
  });

/** A public Spotify track's title, artist and cover for the shared song page (oEmbed + embed page, no API key). */
export const getSpotifyTrack = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().regex(/^[A-Za-z0-9]{22}$/) }).parse(input))
  .handler(async ({ data }) => {
    const url = `https://open.spotify.com/track/${data.id}`;
    const [o, page] = await Promise.all([
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.json() as Promise<{ title?: string; thumbnail_url?: string }> : null).catch(() => null),
      fetch(`https://open.spotify.com/embed/track/${data.id}`, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.text() : "").catch(() => ""),
    ]);
    if (!o?.title) return null;
    const block = page.match(/"artists":\[(.*?)\]/)?.[1] ?? "";
    const artists = [...block.matchAll(/"name":"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse(`"${m[1]}"`) as string);
    const art = o.thumbnail_url?.replace("ab67616d00001e02", "ab67616d0000b273") ?? null;
    return { id: data.id, title: o.title, artist: artists.join(", ") || "Spotify", art, url };
  });
