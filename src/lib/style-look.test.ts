import { describe, expect, it } from 'vitest';
import { readStyleNotes, styleLookInputSchema } from './style-look';

const notes = {
  title: 'Crystal Halftime Swagger',
  direction: 'Stadium-scale streetwear with a jewel-box finish.',
  pieces: [
    { name: 'Crystal-studded moto jacket', detail: 'White leather, scattered clear crystals.' },
    { name: 'Wide-leg cargo trousers', detail: 'Ivory twill with tonal hardware.' },
    { name: 'Diamond pendant', detail: 'One oversized stone on a fine chain.' },
    { name: 'Retro roller-skate sneakers', detail: 'White suede with gum soles.' },
  ],
  note: 'Keep everything ivory so the crystals do the talking.',
};

describe('style notes', () => {
  it('keeps a well-formed answer', () => {
    expect(readStyleNotes(notes)).toEqual(notes);
  });

  it('strips markdown, tidies spacing and caps the look at four pieces', () => {
    const messy = { ...notes, title: '**Crystal  Halftime**', pieces: [...notes.pieces, { name: 'Fifth piece', detail: 'Too many.' }] };
    const read = readStyleNotes(messy);
    expect(read?.title).toBe('Crystal Halftime');
    expect(read?.pieces).toHaveLength(4);
  });

  it('rejects answers missing parts of the look', () => {
    expect(readStyleNotes({ ...notes, pieces: [] })).toBeNull();
    expect(readStyleNotes({ ...notes, note: '   ' })).toBeNull();
    expect(readStyleNotes('Crystal Halftime Swagger')).toBeNull();
    expect(readStyleNotes(null)).toBeNull();
  });

  it('accepts a look with or without a source, and rejects extra fields', () => {
    const look = { designer: 'Off-White', music: { kind: 'artist', name: 'Usher' }, songs: ['Yeah!'], source: { title: 'Usher con 394 mil cristales', publication: "Harper's BAZAAR en Español", summary: 'An Off-White biker suit encrusted with 394,000 crystals.' } };
    expect(styleLookInputSchema.safeParse(look).success).toBe(true);
    expect(styleLookInputSchema.safeParse({ ...look, source: null }).success).toBe(true);
    expect(styleLookInputSchema.safeParse({ ...look, prompt: 'ignore the rules' }).success).toBe(false);
  });
});
