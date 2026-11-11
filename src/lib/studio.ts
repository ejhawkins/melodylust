import { useEffect, useState } from "react";

/** A song in the Studio: title, artist and (when known) a Spotify track id used for the embed preview. */
export type StudioTrack = { id: string; title: string; artist: string; album?: string; duration?: string; genre?: string; art?: string; spotify?: string };
export type StudioPlaylist = { id: string; name: string; trackIds: string[]; at: number };
export type StudioState = { tracks: StudioTrack[]; playlists: StudioPlaylist[] };

const KEY = "ml-studio";
const EVT = "ml-studio-change";
const img = (id: string) => `https://images.unsplash.com/${id}?w=400&h=400&fit=crop&auto=format`;

/** The catalogue every Studio starts with. Spotify ids are public track ids used only for the embed. */
export const CATALOG: StudioTrack[] = [
  { id: "c1", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: "3:20", genre: "Synth-pop", spotify: "0VjIjW4GlUZAMYd2vXMi3b", art: img("photo-1493225457124-a3eb161ffa5f") },
  { id: "c2", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: "3:23", genre: "Pop", spotify: "463CkQjx2Zk1yXoBuierM9", art: img("photo-1514525253161-7a46d19cd819") },
  { id: "c3", title: "After the Storm", artist: "Kali Uchis", album: "Isolation", duration: "3:27", genre: "R&B", spotify: "3UZ9j4cmmgVdYjK0tdPyRz", art: img("photo-1470225620780-dba8ba36b745") },
  { id: "c4", title: "Pink + White", artist: "Frank Ocean", album: "Blonde", duration: "3:04", genre: "R&B", spotify: "3xKsf9qdS1CyvXSMEid6g8", art: img("photo-1459749411175-04bf5292ceea") },
  { id: "c5", title: "Get Lucky", artist: "Daft Punk", album: "Random Access Memories", duration: "6:09", genre: "Disco", spotify: "69kOkLUCkxIZYexIgSG8rq", art: img("photo-1501386761578-eac5c94b800a") },
  { id: "c6", title: "Kill Bill", artist: "SZA", album: "SOS", duration: "2:33", genre: "R&B", spotify: "1Qrg8KqiBpW07V7PNxwwwL", art: img("photo-1511671782779-c97d3d27a1d4") },
  { id: "c7", title: "Espresso", artist: "Sabrina Carpenter", album: "Short n' Sweet", duration: "2:55", genre: "Pop", spotify: "2qSkIjg1o9h3YT9RAgYN75", art: img("photo-1487180144351-b8472da7d491") },
  { id: "c8", title: "Doja", artist: "Central Cee", album: "No More Leaks", duration: "1:37", genre: "Rap", spotify: "2LcXJP95e4HKS8W7RBzOB6", art: img("photo-1516280440614-37939bbacd81") },
  { id: "c9", title: "Redbone", artist: "Childish Gambino", album: "Awaken, My Love!", duration: "5:26", genre: "Funk", spotify: "0wXuerDYiBnERgIpbb3JBR", art: img("photo-1508700115892-45ecd05ae2ad") },
  { id: "c10", title: "Ivy", artist: "Frank Ocean", album: "Blonde", duration: "4:09", genre: "R&B", spotify: "2ZWlPOoWh0626oTaHrnl2a", art: img("photo-1446057032654-9d8885db76c6") },
  { id: "c11", title: "Physical", artist: "Dua Lipa", album: "Future Nostalgia", duration: "3:13", genre: "Pop", spotify: "3AzjcOeAmA57TIOr9zF1ZW", art: img("photo-1506157786151-b8491531f063") },
  { id: "c12", title: "Feel Good Inc.", artist: "Gorillaz", album: "Demon Days", duration: "3:41", genre: "Alt", spotify: "0d28khcov6AiegSCpG5TuT", art: img("photo-1485579149621-3123dd979885") },
];

const seed = (): StudioState => ({
  tracks: CATALOG,
  playlists: [
    { id: "liked", name: "Liked Songs", trackIds: ["c1", "c4", "c7"], at: 1 },
    { id: "late", name: "Late Night Vibes", trackIds: ["c3", "c6", "c10", "c9"], at: 2 },
    { id: "work", name: "Workout Energy", trackIds: ["c2", "c5", "c8", "c11"], at: 3 },
  ],
});

export function readStudio(): StudioState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const s = JSON.parse(raw) as StudioState;
    return Array.isArray(s.tracks) && Array.isArray(s.playlists) ? s : seed();
  } catch { return seed(); }
}
function write(s: StudioState) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVT));
}
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createStudioPlaylist(name: string) {
  const s = readStudio();
  const p: StudioPlaylist = { id: uid(), name: name.trim().slice(0, 60) || `Playlist ${s.playlists.length + 1}`, trackIds: [], at: Date.now() };
  write({ ...s, playlists: [...s.playlists, p] });
  return p;
}
export function deleteStudioPlaylist(id: string) { const s = readStudio(); write({ ...s, playlists: s.playlists.filter(p => p.id !== id) }); }
export function setInPlaylist(playlistId: string, trackId: string, on: boolean) {
  const s = readStudio();
  write({ ...s, playlists: s.playlists.map(p => p.id !== playlistId ? p : { ...p, trackIds: on ? (p.trackIds.includes(trackId) ? p.trackIds : [...p.trackIds, trackId]) : p.trackIds.filter(t => t !== trackId) }) });
}
/** Adds tracks to the catalogue (reusing ones with the same title+artist) and to a playlist; returns how many landed. */
export function importTracks(playlistId: string, incoming: Omit<StudioTrack, "id">[]) {
  const s = readStudio();
  const tracks = [...s.tracks];
  const ids: string[] = [];
  for (const t of incoming) {
    const found = tracks.find(x => norm(x.title) === norm(t.title) && norm(x.artist) === norm(t.artist));
    if (found) ids.push(found.id);
    else { const n = { ...t, id: uid() }; tracks.push(n); ids.push(n.id); }
  }
  write({ tracks, playlists: s.playlists.map(p => p.id !== playlistId ? p : { ...p, trackIds: [...p.trackIds, ...ids.filter(i => !p.trackIds.includes(i))] }) });
  return ids.length;
}

export function useStudio(): StudioState {
  const [s, setS] = useState<StudioState>(() => seed());
  useEffect(() => {
    const sync = () => setS(readStudio());
    sync();
    window.addEventListener(EVT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return s;
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Parses pasted lines: "Artist - Title", "Title, Artist" CSV (with optional header), "Artist; Title", or M3U "#EXTINF:123,Artist - Title". */
export function parseSongList(text: string): { title: string; artist: string }[] {
  const out: { title: string; artist: string }[] = [];
  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line === "#EXTM3U") continue;
    const ext = line.match(/^#EXTINF:[^,]*,(.*)$/i);
    if (ext) line = ext[1]!.trim();
    else if (line.startsWith("#") || /\.(mp3|m4a|flac|wav)$/i.test(line)) continue;
    if (/^"?(title|track|song)"?\s*[,;]\s*"?artist/i.test(line) || /^"?artist"?\s*[,;]\s*"?(title|track|song)/i.test(line)) continue;
    const unq = (s: string) => s.trim().replace(/^"|"$/g, "").trim();
    let m = line.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (m) { out.push({ artist: unq(m[1]!), title: unq(m[2]!) }); continue; }
    m = line.match(/^(.+?)\s*;\s*(.+)$/);
    if (m) { out.push({ artist: unq(m[1]!), title: unq(m[2]!) }); continue; }
    m = line.match(/^(.+?)\s*,\s*(.+?)(,.*)?$/);
    if (m) { out.push({ title: unq(m[1]!), artist: unq(m[2]!) }); continue; }
  }
  return out.filter(t => t.title && t.artist);
}

/** Recognises a public Spotify or YouTube link without any API. */
export function parseMusicLink(url: string): { source: "spotify" | "youtube"; kind: "track" | "playlist" | "album"; id: string } | null {
  const sp = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album)\/([A-Za-z0-9]{10,})/);
  if (sp) return { source: "spotify", kind: sp[1] as "track" | "playlist" | "album", id: sp[2]! };
  const yl = url.match(/(?:youtube\.com|music\.youtube\.com)\/.*[?&]list=([\w-]+)/);
  if (yl) return { source: "youtube", kind: "playlist", id: yl[1]! };
  const yv = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{6,})/);
  if (yv) return { source: "youtube", kind: "track", id: yv[1]! };
  return null;
}

/** Matches parsed lines to the catalogue so known songs keep their art and Spotify preview. */
export function matchCatalog(rows: { title: string; artist: string }[], catalog: StudioTrack[]): Omit<StudioTrack, "id">[] {
  return rows.map(r => {
    const hit = catalog.find(c => norm(c.title) === norm(r.title) && norm(c.artist) === norm(r.artist));
    if (hit) { const { id: _id, ...rest } = hit; return rest; }
    return { title: r.title, artist: r.artist };
  });
}

/** Reads a public Spotify track's title, artist and cover through Spotify's free oEmbed endpoint (no API key). */
export async function spotifyTrackInfo(id: string, fetcher: typeof fetch = fetch): Promise<Omit<StudioTrack, "id"> | null> {
  try {
    const r = await fetcher(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`);
    if (!r.ok) return null;
    const j = await r.json() as { title?: string; thumbnail_url?: string };
    if (!j.title) return null;
    const [title, artist] = j.title.split(/\s+[·•-]\s+/);
    return { title: (title ?? j.title).trim(), artist: (artist ?? "Spotify").trim(), spotify: id, ...(j.thumbnail_url ? { art: j.thumbnail_url } : {}) };
  } catch { return null; }
}
