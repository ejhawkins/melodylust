import { describe, expect, it } from 'vitest';
import { decodeEdit, dossierRole, dossierStats, editFromHash, encodeEdit, memberSince, shareLink, styleDna, wantListPairs } from './dossier';
import { emptyStyleProfile } from './style-profile';
import type { WishItem } from './wishlist';

const item = (over: Partial<WishItem> = {}): WishItem => ({ id: '1', kind: 'piece', name: 'Callipygian ribbed cardigan', detail: 'Fall look: Over a slip skirt', link: 'https://www.farfetch.com/item-1.aspx', note: '', from: 'Shop', image: 'https://cdn-images.farfetch-contents.com/1_400.jpg', ...over });

describe('dossierRole', () => {
  it('names editors, contributors and readers', () => {
    expect(dossierRole({ canModerate: true, notes: 0 })).toBe('Editor');
    expect(dossierRole({ canModerate: false, notes: 2 })).toBe('Contributor');
    expect(dossierRole({ canModerate: false, notes: 0 })).toBe('Reader');
  });
});

describe('memberSince', () => {
  it('formats the month and year, and stays quiet without a date', () => {
    expect(memberSince('2026-10-15T16:03:30Z')).toBe('Member since Oct 2026');
    expect(memberSince(null)).toBeNull();
    expect(memberSince('not a date')).toBeNull();
  });
});

describe('dossierStats', () => {
  it('counts saves, published notes and genres, with published unknown when signed out', () => {
    const profile = { ...emptyStyleProfile(), music: ['R&B', 'Jazz'] };
    const wishes = [item(), item({ id: '2', kind: 'song', name: 'CHIHIRO — Billie Eilish' })];
    expect(dossierStats({ wishes, notes: [{ status: 'approved' }, { status: 'pending' }], profile })).toEqual({ wantList: 2, published: 1, genres: 2 });
    expect(dossierStats({ wishes, notes: null, profile }).published).toBeNull();
  });
});

describe('wantListPairs', () => {
  it('pairs Shop pieces with their song pick and song pop-up pieces with their song', () => {
    const { pieces, songs } = wantListPairs([
      item({ note: 'Day \'N\' Nite — Kid Cudi' }),
      item({ id: '2', name: 'Moon-wash denim jacket', from: 'Day \'N\' Nite — Kid Cudi', note: '' }),
      item({ id: '3', name: 'Leather jacket idea', from: 'AI styling', note: 'Think 70s' }),
      item({ id: '4', kind: 'song', name: 'DANCE... — Slayyyter' }),
    ]);
    expect(pieces.map(p => p.song)).toEqual(['Day \'N\' Nite — Kid Cudi', 'Day \'N\' Nite — Kid Cudi', null]);
    expect(songs.map(s => s.name)).toEqual(['DANCE... — Slayyyter']);
  });
});

describe('styleDna', () => {
  it('leads with genres, palette and fits, and lists the rest', () => {
    const dna = styleDna({ ...emptyStyleProfile(), music: ['R&B'], color: ['Burgundy', 'Teal'], fit: ['Oversized'], aesthetic: ['Minimalist'], artists: 'SZA' });
    expect(dna.genres).toEqual(['R&B']);
    expect(dna.palette).toEqual([{ name: 'Burgundy', hex: '#6D1A2E' }, { name: 'Teal', hex: '#9A938C' }]);
    expect(dna.fits).toEqual(['Oversized']);
    expect(dna.more).toEqual([{ label: 'Aesthetic', values: ['Minimalist'] }, { label: 'Artists', values: ['SZA'] }]);
    expect(dna.empty).toBe(false);
    expect(styleDna(emptyStyleProfile()).empty).toBe(true);
  });
});

describe('sharing an edit', () => {
  it('round-trips an edit through a link, accents and all', () => {
    const song: WishItem = { id: '2', kind: 'song', name: 'Nicole Kidman — ADÉLA', detail: '', link: 'https://open.spotify.com/track/0Vtvich3vkhne7Pzum3tXF', note: '' };
    const items = [song, item({ note: 'Day \'N\' Nite — Kid Cudi' })];
    const link = shareLink('https://melodylust.vercel.app', items);
    expect(link.startsWith('https://melodylust.vercel.app/profile#edit=')).toBe(true);
    expect(editFromHash(new URL(link).hash)).toEqual(items.map(({ id: _id, ...rest }) => rest));
  });

  it('drops unsafe links and photos instead of passing them on', () => {
    const [shared] = decodeEdit(encodeEdit([item({ link: 'javascript:alert(1)', image: 'http://example.com/x.jpg' })]))!;
    expect(shared).toMatchObject({ link: '' });
    expect(shared).not.toHaveProperty('image');
  });

  it('rejects a hand-made code that sneaks in an unsafe link', () => {
    const forged = btoa(JSON.stringify({ v: 1, items: [{ k: 'piece', n: 'Bag', d: '', l: 'javascript:alert(1)' }] })).replace(/=+$/, '');
    expect(decodeEdit(forged)).toBeNull();
  });

  it('ignores broken or missing codes', () => {
    expect(decodeEdit('not-a-code')).toBeNull();
    expect(editFromHash('')).toBeNull();
    expect(editFromHash('#styling-notes')).toBeNull();
  });
});
