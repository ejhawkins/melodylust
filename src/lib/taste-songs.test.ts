import { beforeEach, describe, expect, it } from 'vitest';
import { TASTE_LIMIT, addTasteSong, cleanTasteSong, removeTasteSong, sameSong } from './taste-songs';

const stored = () => JSON.parse(window.localStorage.getItem('ml-taste-songs') ?? '[]') as { id: string; title: string; artist: string; note: string }[];

describe('taste songs', () => {
  beforeEach(() => window.localStorage.clear());

  it('needs a title and an artist, and tidies what was typed', () => {
    expect(cleanTasteSong({ title: '  Patient   Zero ', artist: 'Taylor Swift', note: '' })).toEqual({ title: 'Patient Zero', artist: 'Taylor Swift', note: '' });
    expect(cleanTasteSong({ title: 'Patient Zero', artist: ' ' })).toBeNull();
    expect(addTasteSong({ title: '', artist: 'Someone' })).toBe('invalid');
  });

  it('treats the same song typed differently as one song', () => {
    expect(sameSong({ title: "Choosin' Texas", artist: 'Ella Langley' }, { title: 'choosin texas', artist: 'ELLA LANGLEY' })).toBe(true);
    expect(sameSong({ title: 'Be Her', artist: 'Ella Langley' }, { title: 'Be Her', artist: 'Someone Else' })).toBe(false);
  });

  it('adds newest first, refuses repeats, and removes', () => {
    expect(addTasteSong({ title: 'Dracula', artist: 'Tame Impala', note: 'the bass line' })).toBe('added');
    expect(addTasteSong({ title: 'Jaded', artist: 'Koe Wetzel' })).toBe('added');
    expect(addTasteSong({ title: 'dracula', artist: 'tame impala' })).toBe('duplicate');
    expect(stored().map(s => s.title)).toEqual(['Jaded', 'Dracula']);
    expect(stored()[1]?.note).toBe('the bass line');
    removeTasteSong(stored()[0]!.id);
    expect(stored().map(s => s.title)).toEqual(['Dracula']);
  });

  it('stops at the limit', () => {
    for (let i = 0; i < TASTE_LIMIT; i++) addTasteSong({ title: `Song ${i}`, artist: 'Artist' });
    expect(addTasteSong({ title: 'One more', artist: 'Artist' })).toBe('full');
  });
});
