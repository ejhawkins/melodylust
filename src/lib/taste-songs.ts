import { useEffect, useState } from "react";

// Songs a reader adds by hand to shape their taste profile for AI playlists. Kept in this
// browser only, like the Want List and the music library; nothing here reaches a server.
export type TasteSong = { id: string; title: string; artist: string; note: string; addedAt: string };
export type AddResult = "added" | "duplicate" | "invalid" | "full" | "unsaved";

export const TASTE_LIMIT = 100;
const KEY = "ml-taste-songs";
const EVT = "ml-taste-songs-change";

const tidy = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const key = (s: Pick<TasteSong, "title" | "artist">) => `${s.title}|${s.artist}`.toLowerCase().normalize("NFKD").replace(/[^a-z0-9|]+/g, "");

/** A song as typed, tidied; null without both a title and an artist. */
export function cleanTasteSong(input: { title?: unknown; artist?: unknown; note?: unknown }) {
  const song = { title: tidy(input.title, 120), artist: tidy(input.artist, 120), note: tidy(input.note, 200) };
  return song.title && song.artist ? song : null;
}

/** The same song whatever its capitals, spacing or punctuation. */
export const sameSong = (a: Pick<TasteSong, "title" | "artist">, b: Pick<TasteSong, "title" | "artist">) => key(a) === key(b);

function read(): TasteSong[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((s): s is TasteSong => !!s && typeof s.id === "string" && typeof s.title === "string" && typeof s.artist === "string") : [];
  } catch { return []; }
}
function write(songs: TasteSong[]) {
  try {
    if (songs.length) window.localStorage.setItem(KEY, JSON.stringify(songs)); else window.localStorage.removeItem(KEY);
  } catch { return false; }
  window.dispatchEvent(new Event(EVT));
  return true;
}

export function addTasteSong(input: { title?: unknown; artist?: unknown; note?: unknown }): AddResult {
  const song = cleanTasteSong(input);
  if (!song) return "invalid";
  const songs = read();
  if (songs.some(s => sameSong(s, song))) return "duplicate";
  if (songs.length >= TASTE_LIMIT) return "full";
  const added: TasteSong = { ...song, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: new Date().toISOString() };
  return write([added, ...songs]) ? "added" : "unsaved";
}
export function removeTasteSong(id: string) { write(read().filter(s => s.id !== id)); }

export function useTasteSongs() {
  const [songs, setSongs] = useState<TasteSong[]>([]);
  useEffect(() => {
    const sync = () => setSongs(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return songs;
}
