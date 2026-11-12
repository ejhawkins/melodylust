// The Capsule as a tree: each sound the reader saved pieces from, the pieces it dressed, and songs that share its genres
// to play next. Saved pieces remember their song in `from` (the Listening Room, the shop sheet) or in `note` (Fashion,
// the Style matrix), so the tree is rebuilt from the Want List alone. Plain data, no React, safe anywhere.
import { GENRES, mixGenres, type Genre, type GenreWeights } from "./genre-shapes";
import type { MixSong } from "./listening-room";
import { CATALOG, studioMix } from "./studio";
import type { WishItem } from "./wishlist";

export type CapsuleSong = MixSong & { genres: readonly Genre[] };
export type CapsulePiece = { id: string; name: string; detail: string; image?: string };
/** A recommended song and the genres it shares with the sound it hangs from. */
export type CapsulePick = { song: CapsuleSong; shared: readonly Genre[] };
/** One sound and what grew from it. `sound` is null for pieces saved without a song. */
export type CapsuleBranch = { id: string; sound: CapsuleSong | null; pieces: CapsulePiece[]; picks: CapsulePick[] };
/** `example` is true when the Want List holds no pieces yet and the tree shows the mix's own looks instead. */
export type CapsuleTree = { example: boolean; branches: CapsuleBranch[]; genres: GenreWeights };

/** The Studio files songs under looser names; each is placed in the shape lexicon's genres here. */
const STUDIO_GENRES: Record<string, readonly Genre[]> = {
  "Synth-pop": ["Pop", "Electronic"], Pop: ["Pop"], "R&B": ["R&B"], Disco: ["Electronic", "Pop"],
  Rap: ["Hip-Hop"], "Hip-Hop": ["Hip-Hop"], Funk: ["R&B"], Alt: ["Indie"], Indie: ["Indie"], Rock: ["Rock"], Jazz: ["Jazz"],
};
export const studioGenres = (genre: string | undefined): readonly Genre[] => (genre ? STUDIO_GENRES[genre] ?? (GENRES.includes(genre as Genre) ? [genre as Genre] : []) : []);

const words = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The song a saved piece came from: its `from` names the song exactly, or its note or detail names both title and artist. */
export function soundOf(item: Pick<WishItem, "from" | "note" | "detail">, songs: readonly CapsuleSong[]): CapsuleSong | null {
  const exact = songs.find(song => song.caption === item.from);
  if (exact) return exact;
  const text = words([item.from, item.note, item.detail].filter(Boolean).join(" | "));
  if (!text) return null;
  return songs.find(song => text.includes(words(song.title)) && text.includes(words(song.artist))) ?? null;
}

/** Up to `count` songs that share a genre with `genres`, most shared first, then in pool order. Songs in `skip` are left
 *  out, and ones in `used` (already picked on another branch) only fill in after fresh ones, so branches vary. */
export function recommend(genres: readonly Genre[], pool: readonly CapsuleSong[], skip: ReadonlySet<string>, used: ReadonlySet<string> = new Set(), count = 3): CapsulePick[] {
  return pool
    .map((song, order) => ({ song, order, shared: song.genres.filter(g => genres.includes(g)) }))
    .filter(pick => pick.shared.length > 0 && !skip.has(pick.song.caption))
    .sort((a, b) => Number(used.has(a.song.caption)) - Number(used.has(b.song.caption)) || b.shared.length - a.shared.length || a.order - b.order)
    .slice(0, count)
    .map(({ song, shared }) => ({ song, shared }));
}

/** Every song once, by caption, the first copy kept. */
export const uniqueSongs = (songs: readonly CapsuleSong[]) => songs.filter((song, i) => songs.findIndex(s => s.caption === song.caption) === i);

/**
 * Builds the tree. `songs` are the sounds a piece can hang from (the mix); `pool` is everything that can be recommended
 * (the mix and the Studio). Branches run in the order their sound was first saved, newest first, with pieces saved
 * without a song last. With no saved pieces, `looks` dresses the first three songs of the mix as an example.
 */
export function capsuleTree({ saved, songs, pool, looks, examples = 3 }: {
  saved: readonly WishItem[];
  songs: readonly CapsuleSong[];
  pool: readonly CapsuleSong[];
  looks: Readonly<Record<string, readonly { name: string; price: string }[]>>;
  examples?: number;
}): CapsuleTree {
  const pieces = [...saved].reverse().filter(item => item.kind === "piece");
  const example = pieces.length === 0;
  const groups = new Map<string, { sound: CapsuleSong | null; pieces: CapsulePiece[] }>();
  if (example) {
    for (const song of songs.filter(s => looks[s.caption]?.length).slice(0, examples))
      groups.set(song.caption, { sound: song, pieces: (looks[song.caption] ?? []).map(look => ({ id: `${song.caption}-${look.name}`, name: look.name, detail: look.price })) });
  } else {
    for (const item of pieces) {
      const sound = soundOf(item, songs);
      const key = sound?.caption ?? "";
      const group = groups.get(key) ?? { sound, pieces: [] };
      group.pieces.push({ id: item.id, name: item.name, detail: item.detail, ...(item.image ? { image: item.image } : {}) });
      groups.set(key, group);
    }
  }
  const sounds = [...groups.values()].flatMap(g => (g.sound ? [g.sound] : []));
  const genres = mixGenres(sounds);
  // Pieces with no song follow the capsule's leading genres, or the mix's when no piece has a song either.
  const lead = (weights: GenreWeights) => GENRES.filter(g => (weights[g] ?? 0) > 0).sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)).slice(0, 2);
  const looseGenres = lead(sounds.length ? genres : mixGenres(songs));
  const skip = new Set(sounds.map(s => s.caption));
  const used = new Set<string>();
  const ordered = [...groups.entries()].sort(([a], [b]) => Number(a === "") - Number(b === ""));
  const branches = ordered.map(([key, group]): CapsuleBranch => {
    const picks = recommend(group.sound ? group.sound.genres : looseGenres, pool, skip, used);
    for (const pick of picks) used.add(pick.song.caption);
    return { id: key || "unplaced", sound: group.sound, pieces: group.pieces, picks };
  });
  return { example, branches, genres };
}

// After the Storm and Doja carry Spotify IDs that Spotify no longer knows, so they would sit silent on the bar.
export const UNPLAYABLE: ReadonlySet<string> = new Set(["c3", "c8"]);
/** The Studio's playable songs, each placed in the shape lexicon. */
export const studioSongs: CapsuleSong[] = CATALOG.flatMap(track => {
  const song = studioMix(track);
  const genres = studioGenres(track.genre);
  return song && genres.length && !UNPLAYABLE.has(track.id) ? [{ ...song, genres }] : [];
});
/** The mix's songs that carry genres. */
export const mixSongs = (mix: readonly MixSong[]): CapsuleSong[] => mix.flatMap(song => (song.genres?.length ? [{ ...song, genres: song.genres }] : []));
/** Every real song the room can play and place: the mix, then the Studio. */
export const roomPool = (mix: readonly MixSong[]) => uniqueSongs([...mixSongs(mix), ...studioSongs]);
