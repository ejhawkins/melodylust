// Reads a Google Takeout export of YouTube Music. The library file ("music library songs.csv":
// Video ID, Song Title, Album Title, Artist Name) becomes songs; a playlist file, which Takeout
// writes as video IDs only, is recognised so the reader can be pointed to the library file.
// Pure and browser-safe; keeping the songs on the device lives in music-library.ts.
import Papa from "papaparse";

export type LibrarySong = { videoId: string; title: string; artist: string; album: string };
export type TakeoutRead =
  | { kind: "library"; songs: LibrarySong[] }
  | { kind: "playlist"; videos: number }
  | { kind: "unknown" };

/** Enough for any real library, small enough to sit comfortably in browser storage. */
export const LIBRARY_LIMIT = 10_000;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export function readTakeoutCsv(text: string): TakeoutRead {
  const { data, meta } = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^﻿/, "").trim().toLowerCase(),
  });
  const fields = meta.fields ?? [];
  if (!fields.includes("video id")) return { kind: "unknown" };

  const titleKey = ["song title", "title", "track title"].find((k) => fields.includes(k));
  if (!titleKey) {
    // A playlist's videos: just IDs and when each was added.
    const ids = data.filter((row) => VIDEO_ID.test(clean(row["video id"]))).length;
    return fields.includes("playlist video creation timestamp") || fields.includes("time added") ? { kind: "playlist", videos: ids } : { kind: "unknown" };
  }
  const artistKeys = fields.filter((k) => /^artist name/.test(k));
  const albumKey = ["album title", "album"].find((k) => fields.includes(k));

  const seen = new Set<string>();
  const songs: LibrarySong[] = [];
  for (const row of data) {
    const videoId = clean(row["video id"]);
    const title = clean(row[titleKey]);
    if (!VIDEO_ID.test(videoId) || !title || seen.has(videoId)) continue;
    seen.add(videoId);
    const artist = [...new Set(artistKeys.map((k) => clean(row[k])).filter(Boolean))].join(", ");
    songs.push({ videoId, title, artist, album: albumKey ? clean(row[albumKey]) : "" });
    if (songs.length === LIBRARY_LIMIT) break;
  }
  return { kind: "library", songs };
}

/** Adds an import to the library already on the device: existing songs keep their place, new ones follow. */
export function mergeLibrary(existing: readonly LibrarySong[], incoming: readonly LibrarySong[]) {
  const have = new Set(existing.map((s) => s.videoId));
  const fresh = incoming.filter((s) => !have.has(s.videoId)).slice(0, Math.max(0, LIBRARY_LIMIT - existing.length));
  return { songs: [...existing, ...fresh], added: fresh.length };
}

/** Songs whose title, artist or album contains every word of the query. */
export function searchLibrary(songs: readonly LibrarySong[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...songs];
  return songs.filter((s) => {
    const text = `${s.title} ${s.artist} ${s.album}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

export const listenUrl = (videoId: string) => `https://music.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
