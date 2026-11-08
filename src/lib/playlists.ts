import { useEffect, useState } from "react";

/** A playlist the reader made in the listening room's library: a name and songs from The Autumn Mix, kept by caption
 *  (never by position) in the order they were added. Kept on this device, like likes and the Want List. */
export type Playlist = { id: string; name: string; songs: string[]; at: number };

const KEY = "ml-playlists";
const EVT = "ml-playlists-change";
/** The longest name a playlist keeps. */
export const NAME_MAX = 60;

const isPlaylist = (value: unknown): value is Playlist => {
  const v = value as Partial<Playlist> | null;
  return typeof v === "object" && v !== null && typeof v.id === "string" && typeof v.name === "string" && typeof v.at === "number"
    && Array.isArray(v.songs) && v.songs.every(s => typeof s === "string");
};

export function readPlaylists(): Playlist[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isPlaylist) : [];
  } catch { return []; }
}
function write(playlists: Playlist[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(playlists)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT));
}

/** Makes an empty playlist and returns it. A blank name becomes "My playlist", numbered after the first. */
export function createPlaylist(name: string): Playlist {
  const playlists = readPlaylists();
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
  const playlist = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: trimmed || (playlists.length ? `My playlist ${playlists.length + 1}` : "My playlist"), songs: [], at: Date.now() };
  write([...playlists, playlist]);
  return playlist;
}

/** Adds a song to a playlist, or takes it off; returns whether it is in the playlist now. */
export function toggleSong(id: string, caption: string) {
  let added = false;
  write(readPlaylists().map(p => {
    if (p.id !== id) return p;
    added = !p.songs.includes(caption);
    return { ...p, songs: added ? [...p.songs, caption] : p.songs.filter(s => s !== caption) };
  }));
  return added;
}

export function deletePlaylist(id: string) {
  write(readPlaylists().filter(p => p.id !== id));
}

/** The reader's playlists, oldest first, kept in step across components and tabs. */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  useEffect(() => {
    const sync = () => setPlaylists(readPlaylists().sort((a, b) => a.at - b.at));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return playlists;
}
