import { describe, expect, it } from 'vitest';
import type { Like } from './likes';
import { tasteSignals } from './taste-signals';
import type { WishItem } from './wishlist';

const songs = [
  { caption: 'WE ON GO II — BIA', genres: ['Hip-Hop'] },
  { caption: 'Bird Song — Lene Lovich', genres: ['Rock', 'Indie'] },
  { caption: 'Untagged — Someone' },
];
const boards = [{ id: 'rock', genres: ['Grunge', 'Quiet Luxury'] }, { id: 'y2k', genres: ['Y2K', 'Grunge'] }];
const like = (kind: Like['kind'], key: string): Like => ({ kind, key, at: 1 });
const wish = (name: string, kind: WishItem['kind'] = 'song'): WishItem => ({ id: name, kind, name, detail: '', link: '', note: '' });

describe('tasteSignals', () => {
  it('reads music genres from hearted looks and saved songs, and style genres from hearted moodboards', () => {
    const signals = tasteSignals({
      likes: [like('look', 'WE ON GO II — BIA'), like('board', 'rock'), like('board', 'y2k')],
      wishes: [wish('WE ON GO II — BIA'), wish('Bird Song — Lene Lovich')],
      songs, boards,
    });
    expect(signals.music).toEqual([{ label: 'Hip-Hop', count: 2 }, { label: 'Indie', count: 1 }, { label: 'Rock', count: 1 }]);
    expect(signals.style).toEqual([{ label: 'Grunge', count: 2 }, { label: 'Quiet Luxury', count: 1 }, { label: 'Y2K', count: 1 }]);
    expect(signals.saves).toBe(5);
  });

  it('skips saves it can’t place: pieces, unknown songs and boards, other kinds of hearts', () => {
    const signals = tasteSignals({
      likes: [like('story', '3'), like('board', 'gone'), like('look', 'Not in the mix')],
      wishes: [wish('A coat', 'piece'), wish('Untagged — Someone')],
      songs, boards,
    });
    expect(signals).toEqual({ music: [], style: [], saves: 1 });
  });

  it('keeps the top four', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ caption: `s${i}`, genres: [`G${i}`] }));
    const signals = tasteSignals({ likes: many.map(s => like('look', s.caption)), wishes: [], songs: many, boards });
    expect(signals.music).toHaveLength(4);
  });
});
