import { describe, expect, it } from 'vitest';
import { LIBRARY_LIMIT, listenUrl, mergeLibrary, readTakeoutCsv, searchLibrary, type LibrarySong } from './youtube-takeout';

// "music library songs.csv" as Google Takeout writes it: BOM, Windows line endings, quoted commas.
const library = '﻿Video ID,Song Title,Album Title,Artist Name\r\n'
  + 'dQw4w9WgXcQ,Patient Zero,"The Life of a Showgirl (Deluxe)",Taylor Swift\r\n'
  + 'abcdefghijk,"Choosin\' Texas, Live",Choosin\' Texas,Ella Langley\r\n'
  + '\r\n';

const song = (videoId: string, title: string, artist = '', album = ''): LibrarySong => ({ videoId, title, artist, album });

describe('readTakeoutCsv', () => {
  it('reads the music library file into songs', () => {
    expect(readTakeoutCsv(library)).toEqual({ kind: 'library', songs: [
      song('dQw4w9WgXcQ', 'Patient Zero', 'Taylor Swift', 'The Life of a Showgirl (Deluxe)'),
      song('abcdefghijk', "Choosin' Texas, Live", 'Ella Langley', "Choosin' Texas"),
    ] });
  });

  it('joins artists spread over numbered columns', () => {
    const csv = 'Video ID,Song Title,Album Title,Artist Name 1,Artist Name 2\nabcdefghijk,Jaded,Jaded,Koe Wetzel,Ella Langley\n';
    expect(readTakeoutCsv(csv)).toEqual({ kind: 'library', songs: [song('abcdefghijk', 'Jaded', 'Koe Wetzel, Ella Langley', 'Jaded')] });
  });

  it('skips rows without a real video or a title, and repeats', () => {
    const csv = 'Video ID,Song Title,Album Title,Artist Name\nshort,Nope,,\nabcdefghijk,,,\nabcdefghijk,Kept,,A\nabcdefghijk,Again,,A\n';
    expect(readTakeoutCsv(csv)).toEqual({ kind: 'library', songs: [song('abcdefghijk', 'Kept', 'A')] });
  });

  it('recognises a playlist file, which lists video IDs only', () => {
    const csv = 'Video ID,Playlist Video Creation Timestamp\ndQw4w9WgXcQ,2026-01-02T03:04:05+00:00\nabcdefghijk,2026-01-03T03:04:05+00:00\n';
    expect(readTakeoutCsv(csv)).toEqual({ kind: 'playlist', videos: 2 });
  });

  it('turns away anything else', () => {
    expect(readTakeoutCsv('')).toEqual({ kind: 'unknown' });
    expect(readTakeoutCsv('Type,Name,Detail\nsong,A,B\n')).toEqual({ kind: 'unknown' });
    expect(readTakeoutCsv('Video ID,Views\nabcdefghijk,12\n')).toEqual({ kind: 'unknown' });
  });
});

describe('mergeLibrary', () => {
  it('keeps what is there and adds only new songs', () => {
    const existing = [song('aaaaaaaaaaa', 'One')];
    const { songs, added } = mergeLibrary(existing, [song('aaaaaaaaaaa', 'One again'), song('bbbbbbbbbbb', 'Two')]);
    expect(added).toBe(1);
    expect(songs.map(s => s.title)).toEqual(['One', 'Two']);
  });

  it('stops at the library limit', () => {
    const full = Array.from({ length: LIBRARY_LIMIT }, (_, i) => song(`x${String(i).padStart(10, '0')}`, `Song ${i}`));
    expect(mergeLibrary(full, [song('bbbbbbbbbbb', 'Over')]).added).toBe(0);
  });
});

describe('searchLibrary', () => {
  const songs = [song('aaaaaaaaaaa', 'Patient Zero', 'Taylor Swift', 'Showgirl'), song('bbbbbbbbbbb', 'Jaded', 'Koe Wetzel, Ella Langley')];
  it('matches every word across title, artist and album', () => {
    expect(searchLibrary(songs, 'ella jaded').map(s => s.title)).toEqual(['Jaded']);
    expect(searchLibrary(songs, 'SHOWGIRL').map(s => s.title)).toEqual(['Patient Zero']);
    expect(searchLibrary(songs, '  ')).toHaveLength(2);
  });
});

describe('listenUrl', () => {
  it('opens the song in YouTube Music', () => {
    expect(listenUrl('dQw4w9WgXcQ')).toBe('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});
