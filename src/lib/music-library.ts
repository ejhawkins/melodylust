import { useEffect, useState } from "react";
import { mergeLibrary, type LibrarySong } from "@/lib/youtube-takeout";

// The reader's YouTube Music library, imported from Google Takeout and kept in this browser only.
const KEY = "ml-music-library";
const EVT = "ml-music-library-change";

const isSong = (v: unknown): v is LibrarySong => {
  const s = v as Partial<LibrarySong> | null;
  return !!s && typeof s.videoId === "string" && typeof s.title === "string" && typeof s.artist === "string" && typeof s.album === "string";
};

function read(): LibrarySong[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter(isSong) : [];
  } catch { return []; }
}
function write(songs: LibrarySong[]) {
  try {
    if (songs.length) window.localStorage.setItem(KEY, JSON.stringify(songs)); else window.localStorage.removeItem(KEY);
  } catch { return false; }
  window.dispatchEvent(new Event(EVT));
  return true;
}

/** Adds a Takeout import to the library on this device: how many songs were new, or null when the browser won't store them. */
export function importSongs(incoming: readonly LibrarySong[]): number | null {
  const { songs, added } = mergeLibrary(read(), incoming);
  if (!added) return 0;
  return write(songs) ? added : null;
}
/** Empties the music library on this device. */
export function clearMusicLibrary() { write([]); }

export function useMusicLibrary() {
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  useEffect(() => {
    const sync = () => setSongs(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return songs;
}
