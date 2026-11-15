import { describe, expect, it } from 'vitest';
import { stories } from '@/data/home';
import { choiceLabel, editionStories, EDITION_GENRES, isGenreChoice, noteGenres, notesFor, songsFor, storiesFor } from './genre-edition';
import type { MixSong } from './listening-room';
import { noteId } from './runway-notes';

const song = (title: string, genres?: MixSong['genres']): MixSong => ({ caption: `${title} — X`, title, artist: 'X', art: '', alt: '', link: '', ...(genres ? { genres } : {}) });
const note = (id: string, songId: string | null = null) => ({ id, lead: songId ? { title: 't', artist: 'a', part: null, spotifyId: null, why: null, songId } : null });

describe('genre edition', () => {
  it('offers Hip-Hop, Electronic and Rock beside the whole edit', () => {
    expect(EDITION_GENRES).toEqual(['Hip-Hop', 'Electronic', 'Rock']);
    expect(choiceLabel('all')).toBe('All Curated');
    expect(choiceLabel('Hip-Hop')).toBe('Hip-Hop');
    expect(isGenreChoice('Rock')).toBe(true);
    expect(isGenreChoice('Jazz')).toBe(false);
    expect(isGenreChoice(null)).toBe(false);
  });

  it('has bundled stories for every genre on offer, so an edition is never empty before Contentful is connected', () => {
    for (const genre of EDITION_GENRES) expect(storiesFor(stories, genre).length).toBeGreaterThan(0);
    expect(storiesFor(stories, 'Hip-Hop').every(s => s.genre === 'Hip-Hop')).toBe(true);
    expect(storiesFor(stories, 'all')).toHaveLength(stories.length);
  });

  it('prefers Contentful stories for the genre and falls back to the bundled ones', () => {
    const bundled = [{ genre: 'Hip-Hop', title: 'bundled' }, { genre: 'Rock', title: 'rock' }];
    const remote = [{ genre: 'Hip-Hop', title: 'remote' }];
    expect(editionStories(remote, bundled, 'Hip-Hop').map(s => s.title)).toEqual(['remote']);
    expect(editionStories(remote, bundled, 'Rock').map(s => s.title)).toEqual(['rock']);
    expect(editionStories(null, bundled, 'Hip-Hop').map(s => s.title)).toEqual(['bundled']);
    expect(editionStories([], bundled, 'all')).toHaveLength(2);
  });

  it('keeps each song’s place in the mix so it still plays the right one', () => {
    const mix = [song('a', ['Pop']), song('b', ['Hip-Hop', 'R&B']), song('c'), song('d', ['Hip-Hop'])];
    expect(songsFor(mix, 'Hip-Hop').map(s => s.index)).toEqual([1, 3]);
    expect(songsFor(mix, 'Rock')).toEqual([]);
    expect(songsFor(mix, 'all')).toHaveLength(4);
  });

  it('files the written Runway Notes by their music', () => {
    const wales = noteId({ house: 'Wales Bonner', season: 'Autumn/Winter', year: 2024 });
    const owens = noteId({ house: 'Rick Owens', season: 'Fall/Winter Men’s', year: 2025 });
    const notes = [note(wales), note(owens)];
    expect(notesFor(notes, [], 'Hip-Hop').map(n => n.id)).toEqual([wales]);
    expect(notesFor(notes, [], 'Rock').map(n => n.id)).toEqual([owens]);
    expect(notesFor(notes, [], 'all')).toHaveLength(2);
  });

  it('files an unwritten note by its lead song’s catwalk energy, and leaves it out when it has none', () => {
    const songs = [{ id: 's1', category: 'B' as const }, { id: 's2', category: 'C' as const }, { id: 's3', category: 'D' as const }];
    expect(noteGenres(note('club', 's1'), songs)).toEqual(['Electronic']);
    expect(noteGenres(note('band', 's2'), songs)).toEqual(['Rock']);
    expect(noteGenres(note('drone', 's3'), songs)).toEqual([]);
    expect(noteGenres(note('unknown'), songs)).toEqual([]);
  });
});
