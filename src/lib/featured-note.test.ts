import { describe, expect, it } from 'vitest';
import { featuredNote, HOUSE_NOTE } from './featured-note';
import type { StylingNoteView } from './styling-notes.functions';

const note = (over: Partial<StylingNoteView> = {}): StylingNoteView => ({
  id: '0b6f5c2e-7d0e-4c55-9a59-2f6a3c1d9e10', owner_id: 'u1', status: 'approved',
  author_display_name: 'Maya R.', title: 'Camel coat, loud headphones',
  styling_idea: 'A camel coat over a grey hoodie, straight denim and loafers. Big headphones, small earrings.',
  tags: ['fall'], song_artist: 'Billie Eilish', song_track: 'CHIHIRO', song_reason: 'Slow build, soft layers.',
  photo_paths: ['u1/a.jpg'], photo_alts: ['Camel coat over a grey hoodie'], photo_urls: ['https://example.supabase.co/a.jpg?token=1'],
  rejection_reason: null, reviewed_at: '2026-10-18T09:00:00Z', reviewed_by: 'mod', created_at: '2026-10-18T08:00:00Z', updated_at: '2026-10-18T09:00:00Z',
  ...over,
});

describe('featuredNote', () => {
  it('features the first approved note with its author, song and photo', () => {
    expect(featuredNote([note()])).toEqual({
      kicker: 'Featured style note',
      quote: 'A camel coat over a grey hoodie, straight denim and loafers. Big headphones, small earrings.',
      by: 'Maya R., in Styling Notes',
      song: 'CHIHIRO — Billie Eilish',
      image: 'https://example.supabase.co/a.jpg?token=1',
      alt: 'Camel coat over a grey hoodie',
      fromReaders: true,
    });
  });

  it('shortens a long idea at a word so it fits the card', () => {
    const long = 'Layer a cropped leather jacket over a slip dress, then a long cardigan over both, '.repeat(4);
    const { quote } = featuredNote([note({ styling_idea: long })]);
    expect(quote.length).toBeLessThanOrEqual(151);
    expect(quote.endsWith('…')).toBe(true);
    expect(quote).not.toMatch(/\s…$/);
  });

  it('skips notes that are not approved', () => {
    expect(featuredNote([note({ status: 'pending' }), note({ author_display_name: 'Jo', status: 'approved' })]).by).toBe('Jo, in Styling Notes');
  });

  it('keeps the house note when there is nothing to feature', () => {
    expect(featuredNote([])).toBe(HOUSE_NOTE);
    expect(featuredNote(null)).toBe(HOUSE_NOTE);
    expect(featuredNote([note({ status: 'rejected' })])).toBe(HOUSE_NOTE);
  });

  it('leaves the photo to the page when a note has none that loaded', () => {
    expect(featuredNote([note({ photo_urls: [''] })])).toMatchObject({ image: null, alt: 'Camel coat, loud headphones' });
  });
});
