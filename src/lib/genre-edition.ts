// The personalised edition: one genre's stories, runway pairings and songs, netted out of what the room already holds.
// Plain data and filters, safe in the browser and on the server.
import type { Genre } from './genre-shapes';
import type { MixSong } from './listening-room';
import { noteId, type RunwayNote } from './runway-notes';
import type { CategoryId } from './runway-sampler';
import type { RunwaySong } from './runway-songs';

/** The genres a reader can ask the room to be curated for. */
export const EDITION_GENRES = ['Hip-Hop', 'Electronic', 'Rock'] as const satisfies readonly Genre[];
export type EditionGenre = (typeof EDITION_GENRES)[number];
/** The reader's choice: one genre, or the whole edit. */
export type GenreChoice = EditionGenre | 'all';
export const ALL_CURATED = 'All Curated';
export const choiceLabel = (choice: GenreChoice) => (choice === 'all' ? ALL_CURATED : choice);
export const isGenreChoice = (value: unknown): value is GenreChoice =>
  value === 'all' || EDITION_GENRES.some(genre => genre === value);

/** The reader's genre applied to stories, whatever their source. Stories carry their genre as the journal spells it. */
export function storiesFor<T extends { genre: string }>(stories: readonly T[], choice: GenreChoice): T[] {
  return choice === 'all' ? [...stories] : stories.filter(story => story.genre.toLowerCase() === choice.toLowerCase());
}

/** Contentful's stories when it has any for this choice; otherwise the bundled stories, filtered the same way. */
export function editionStories<T extends { genre: string }>(remote: readonly T[] | null | undefined, bundled: readonly T[], choice: GenreChoice): T[] {
  const fromRemote = storiesFor(remote ?? [], choice);
  return fromRemote.length ? fromRemote : storiesFor(bundled, choice);
}

/** The Autumn Mix songs filed under the genre, each with its place in the mix so the room can play it. */
export function songsFor(mix: readonly MixSong[], choice: GenreChoice): { song: MixSong; index: number }[] {
  return mix.map((song, index) => ({ song, index })).filter(({ song }) => choice === 'all' || (song.genres ?? []).includes(choice));
}

/** The genre each written Runway Note is filed under, by its lead music: Mos Def's "Mathematics" at Wales Bonner, Bowie
 *  at Rick Owens. Louis Vuitton's gospel "JOY (Unspeakable)" is filed under R&B, and under Hip-Hop for Pharrell
 *  Williams, who made the record and designed the show. */
const NOTE_GENRES: Record<string, readonly Genre[]> = {
  [noteId({ house: 'Thom Browne', season: 'Fall/Winter', year: 2017 })]: ['Rock'],
  [noteId({ house: 'Rick Owens', season: 'Fall/Winter Men’s', year: 2025 })]: ['Rock'],
  [noteId({ house: 'Rick Owens', season: 'Fall/Winter Women’s', year: 2025 })]: ['Rock'],
  [noteId({ house: 'Bottega Veneta', season: 'Spring/Summer', year: 2026 })]: ['Jazz', 'Rock'],
  [noteId({ house: 'Louis Vuitton', season: 'Spring/Summer Men’s', year: 2024 })]: ['Hip-Hop', 'R&B'],
  [noteId({ house: 'Maison Margiela', season: 'Artisanal', year: 2024 })]: ['Pop'],
  [noteId({ house: 'Wales Bonner', season: 'Autumn/Winter', year: 2024 })]: ['Hip-Hop'],
};
/** Runway Songs files its tracks by catwalk energy, not genre; this is the nearest genre for each. Industrial (club and
 *  sub-bass) and Electro-pulse are electronic, Post-punk is rock, and Spatial (drones, neo-classical) is neither. */
const ENERGY_GENRES: Record<CategoryId, readonly Genre[]> = { A: ['Electronic'], B: ['Electronic'], C: ['Rock'], D: [] };

/** A Runway Note's genres: as filed above, else from the catwalk energy of its lead song. */
export function noteGenres(note: Pick<RunwayNote, 'id' | 'lead'>, songs: readonly Pick<RunwaySong, 'id' | 'category'>[]): readonly Genre[] {
  const filed = NOTE_GENRES[note.id];
  if (filed) return filed;
  const lead = note.lead?.songId ? songs.find(song => song.id === note.lead?.songId) : undefined;
  return lead ? ENERGY_GENRES[lead.category] : [];
}

/** The runway soundtrack pairings for the reader's genre, in the order the room holds them. */
export function notesFor<T extends Pick<RunwayNote, 'id' | 'lead'>>(notes: readonly T[], songs: readonly Pick<RunwaySong, 'id' | 'category'>[], choice: GenreChoice): T[] {
  return choice === 'all' ? [...notes] : notes.filter(note => noteGenres(note, songs).includes(choice));
}
