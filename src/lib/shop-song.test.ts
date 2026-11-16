import { describe, expect, it } from 'vitest';
import { editNumber, inEdit, splitCaption } from './shop-song';
import type { WishItem } from './wishlist';

const item = (patch: Partial<WishItem>): WishItem => ({ id: 'x', kind: 'piece', name: 'Glove', detail: '', link: '', note: '', ...patch });

describe('shop the song', () => {
  it('splits a caption into title and artist', () => {
    expect(splitCaption("Day 'N' Nite — Kid Cudi")).toEqual({ title: "Day 'N' Nite", artist: 'Kid Cudi' });
    expect(splitCaption('The cover story')).toEqual({ title: 'The cover story', artist: '' });
  });

  it('finds a piece on the Want List only for the same song', () => {
    const items = [item({ name: 'Glove', from: 'Song A' }), item({ kind: 'song', name: 'Coat', from: 'Song B' })];
    expect(inEdit(items, 'Song A', 'Glove')).toBe(true);
    expect(inEdit(items, 'Song B', 'Glove')).toBe(false);
    expect(inEdit(items, 'Song B', 'Coat')).toBe(false);
  });

  it('numbers garments from 01', () => {
    expect(editNumber(0)).toBe('No. 01');
    expect(editNumber(11)).toBe('No. 12');
  });
});
