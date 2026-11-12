import { describe, expect, it } from 'vitest';
import { resolveSampler, emptySamplerEdits } from './runway-sampler';
import { runwaySongs, type RunwaySong } from './runway-songs';
import { editorialSongs, noteId, paragraphs, RUNWAY_NOTE_EDITORIAL, runwayNotes, type NoteEditorial } from './runway-notes';
import { showKey, type ShowNotes } from './show-notes';

const song = (id: string, name: string, show: Partial<RunwaySong> = {}): RunwaySong => ({
  id, name, version: null, artist: 'Artist', house: 'Maison Test', season: 'Spring/Summer', year: 2024, designers: [{ name: 'Ada Test', wikipedia: 'https://en.wikipedia.org/wiki/Ada', photo: null }],
  category: 'B', spotifyUri: `spotify:track:${id.padEnd(22, '0').slice(0, 22)}`, spotifyUrl: `https://open.spotify.com/track/${id.padEnd(22, '0').slice(0, 22)}`, looks: [], ...show,
});
const sampler = runwaySongs(resolveSampler(emptySamplerEdits()));

describe('Runway Notes', () => {
  it('writes the Thom Browne note with all three sections, in order, from its sources', () => {
    const room = [...sampler, ...editorialSongs(sampler)];
    const [note] = runwayNotes(room);
    expect(note).toMatchObject({ id: 'thom-browne-fall-winter-2017', house: 'Thom Browne', designers: ['Thom Browne'], season: 'Fall/Winter', year: 2017, initial: 'T', avatar: null });
    expect(note?.sections).toEqual(['report', 'music', 'style']);
    expect(note?.report).toMatchObject({ place: 'Skylight Modern, New York', summaryByAi: false });
    // No review names a muse, so the designer's own words stand in that slot, with where he said them.
    expect(note?.report?.voice).toMatchObject({ kind: 'quote', by: 'Thom Browne', source: { url: expect.stringContaining('wmagazine.com') } });
    expect(note?.report?.summary).toHaveLength(1);
    expect(note?.music?.credit).toBeNull();
    expect(note?.music?.tracks.map(track => [track.part, track.title, track.artist, Boolean(track.spotifyId)])).toEqual([
      ['First movement', null, 'Wagner', false],
      ['Second movement', null, 'Kraftwerk', false],
      ['Third movement', 'The Dope Show', 'Marilyn Manson', true],
    ]);
    expect(note?.music?.tracks.every(track => track.why)).toBe(true);
    // The card names and plays the one track that is in the room's queue.
    expect(note?.lead).toMatchObject({ title: 'The Dope Show', songId: 'thom-browne-fall-winter-2017-the-dope-show' });
    expect(note?.style?.length).toBeGreaterThanOrEqual(3);
    expect(note?.style?.length).toBeLessThanOrEqual(5);
    expect(note?.sources.map(source => source.checked)).toEqual(['read', 'read', 'read', 'excerpt']);
  });

  it('adds the Thom Browne track to the end of the queue once, and never a piece without a named track', () => {
    const added = editorialSongs(sampler);
    expect(added.map(track => [track.name, track.artist, track.house, track.spotifyUri])).toEqual([['The Dope Show', 'Marilyn Manson', 'Thom Browne', 'spotify:track:1wrIp2G2kEa2pt6jsUJ05A']]);
    expect(editorialSongs([...sampler, ...added])).toEqual([]);
  });

  it('keeps the existing shows as notes: one per show, with every song it played', () => {
    const notes = runwayNotes(sampler, {}, []);
    expect(notes).toHaveLength(new Set(sampler.map(noteId)).size);
    const resort = notes.find(note => note.house === 'Prada' && note.season === 'Resort');
    expect(resort?.music?.tracks.map(track => track.title)).toEqual(['The One I Love', 'Mad World', 'Wake Up']);
    expect(resort?.designers).toEqual(['Miuccia Prada']);
    // No editorial and no AI notes: Music only, so no Report or Style heading and no card line.
    expect(resort?.sections).toEqual(['music']);
    expect(resort).toMatchObject({ report: null, style: null, why: null });
    expect(notes.flatMap(note => note.music?.tracks ?? []).map(track => track.songId)).toEqual(expect.arrayContaining(sampler.map(track => track.id)));
  });

  it('renders a section only when it has content, always Report, then Music, then Style', () => {
    const reportOnly: NoteEditorial = { house: 'Atelier Nine', season: 'Fall/Winter', year: 2025, designers: [{ name: 'Nine Moreau', wikipedia: 'https://example.com' }], summary: 'One room. One look. No music was reported.' };
    const [only] = runwayNotes([], {}, [reportOnly]);
    expect(only).toMatchObject({ sections: ['report'], music: null, style: null, lead: null, initial: 'N' });
    expect(only?.report).toMatchObject({ place: null, voice: null, showstopper: null });

    const styleAndMusic: NoteEditorial = { house: 'Maison Test', season: 'Spring/Summer', year: 2024, style: [{ text: 'Wear it loose.' }, { text: '   ' }] };
    const [note] = runwayNotes([song('a', 'Opening')], {}, [styleAndMusic]);
    expect(note?.sections).toEqual(['music', 'style']);
    expect(note?.style).toEqual([{ text: 'Wear it loose.' }]);
  });

  it('numbers a five-song show as one tracklist in running order', () => {
    const five = ['One', 'Two', 'Three', 'Four', 'Five'].map((name, index) => song(`track${index}`, name));
    const [note] = runwayNotes(five, {}, [{ house: 'Maison Test', season: 'Spring/Summer', year: 2024, musicCredit: 'Mixed by Sam Example', whyBySong: { track2: 'The bridge of the show.' } }]);
    expect(note?.music?.tracks.map(track => track.title)).toEqual(['One', 'Two', 'Three', 'Four', 'Five']);
    expect(note?.music?.credit).toBe('Mixed by Sam Example');
    expect(note?.music?.tracks[2]?.why).toBe('The bridge of the show.');
    expect(note?.lead?.title).toBe('One');
  });

  it('shows the muse when there is one, and the designer quote only in her absence', () => {
    const quote = RUNWAY_NOTE_EDITORIAL[0]!.quote!;
    const show = { house: 'Maison Test', season: 'Spring/Summer', year: 2024, quote };
    expect(runwayNotes([], {}, [{ ...show, muse: 'Grace Jones' }])[0]?.report?.voice).toEqual({ kind: 'muse', text: 'Grace Jones' });
    expect(runwayNotes([], {}, [show])[0]?.report?.voice).toMatchObject({ kind: 'quote', text: quote.text });
  });

  it('uses a show’s AI notes for the summary when no editor wrote one, and says so', () => {
    const ai: ShowNotes = { summary: 'A white room.', atmosphere: 'Quiet and slow.', palette: [], silhouettes: [], materials: [], details: [], sources: [{ url: 'https://example.com/review', title: 'A review' }], model: 'gemini', generatedAt: '2026-01-01' };
    const track = song('a', 'Opening');
    const [note] = runwayNotes([track], { [showKey(track)]: ai }, []);
    expect(note?.sections).toEqual(['report', 'music']);
    expect(note?.report).toMatchObject({ summary: ['A white room. Quiet and slow.'], summaryByAi: true });
    expect(note?.sources).toEqual([{ title: 'A review', url: 'https://example.com/review', checked: 'read' }]);
  });

  it('breaks long text into paragraphs of three sentences or fewer', () => {
    expect(paragraphs('One. Two! Three? Four. Five.')).toEqual(['One. Two! Three?', 'Four. Five.']);
    expect(paragraphs('  A single line with no stop  ')).toEqual(['A single line with no stop']);
    expect(paragraphs('He said “no.” Then he left.')).toEqual(['He said “no.” Then he left.']);
  });
});
