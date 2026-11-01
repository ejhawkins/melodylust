import { describe, expect, it } from 'vitest';
import { readShowNotes, readStoredShowNotes, showKey, showNotesJsonPrompt, showNotesResearchPrompt, tickerItems } from './show-notes';

const loewe = { house: 'Loewe', season: 'Spring/Summer', year: 2021 };
const cited = [
  { url: 'https://www.wallpaper.com/fashion/loewe-ss21', title: 'wallpaper.com' },
  { url: 'https://www.loewe.com/eur/en/stories/show-in-a-box', title: 'loewe.com' },
];
const payload = {
  summary: 'A show in a box: the collection mailed to guests with paper cut-outs and a record.',
  atmosphere: 'No audience; guests built the set themselves from a pop-up kit.',
  palette: ['ivory', 'black', 'ivory', 'cobalt'],
  silhouettes: ['ballooning skirts', 'wired hems'],
  materials: ['paper-light cotton'],
  details: [],
  sources: ['https://wallpaper.com/fashion/loewe-ss21?utm_source=x', 'https://made-up.example/review'],
};

describe('Show notes', () => {
  it('keys a show the same way whatever its punctuation or accents', () => {
    expect(showKey(loewe)).toBe('show-notes|v1|loewe|spring-summer|2021');
    expect(showKey({ house: 'Maison Margiela ', season: 'Haute Couture', year: 2024 })).toBe(showKey({ house: 'maison-margiéla', season: 'haute couture', year: 2024 }));
  });

  it('keeps notes only with the pages Google Search returned, linked as cited', () => {
    const notes = readShowNotes(payload, cited, 'gemini-3.8-flash', '2026-10-31T12:00:00.000Z');
    expect(notes).toEqual({
      summary: payload.summary,
      atmosphere: payload.atmosphere,
      palette: ['ivory', 'black', 'cobalt'],
      silhouettes: ['ballooning skirts', 'wired hems'],
      materials: ['paper-light cotton'],
      details: [],
      sources: [{ url: 'https://www.wallpaper.com/fashion/loewe-ss21', title: 'wallpaper.com' }],
      model: 'gemini-3.8-flash',
      generatedAt: '2026-10-31T12:00:00.000Z',
    });
  });

  it('drops notes that cite nothing Google Search returned, or describe nothing', () => {
    expect(readShowNotes({ ...payload, sources: ['https://made-up.example/review'] }, cited, 'm', 't')).toBeNull();
    expect(readShowNotes({ summary: null }, cited, 'm', 't')).toBeNull();
    expect(readShowNotes({ ...payload, sources: ['http://www.wallpaper.com/fashion/loewe-ss21'] }, [{ url: 'http://www.wallpaper.com/fashion/loewe-ss21' }], 'm', 't')).toBeNull();
  });

  it('reads stored notes back, and refuses a row that is not notes', () => {
    const notes = readShowNotes(payload, cited, 'm', 't');
    expect(readStoredShowNotes(JSON.parse(JSON.stringify(notes)))).toEqual(notes);
    expect(readStoredShowNotes([{ id: 'a product' }])).toBeNull();
    expect(readStoredShowNotes({ ...notes, sources: [] })).toBeNull();
  });

  it('runs the ticker in reading order, skipping what wasn’t reported and naming the AI and its sources', () => {
    const notes = readShowNotes(payload, cited, 'm', 't')!;
    expect(tickerItems(notes)).toEqual([
      { label: 'The show', text: payload.summary },
      { label: 'Atmosphere', text: payload.atmosphere },
      { label: 'Palette', text: 'ivory · black · cobalt' },
      { label: 'Silhouettes', text: 'ballooning skirts · wired hems' },
      { label: 'Materials', text: 'paper-light cotton' },
      { label: 'AI notes', text: 'Gemini, from wallpaper.com' },
    ]);
  });

  it('asks for research in prose, then for JSON from the numbered sources only', () => {
    expect(showNotesResearchPrompt(loewe)).toContain('"Loewe Spring/Summer 2021" runway show');
    expect(showNotesResearchPrompt(loewe)).toMatch(/Do not describe other seasons/);
    const prompt = showNotesJsonPrompt(loewe, 'A box [1].', [{ number: 1, url: cited[0]!.url }]);
    expect(prompt).toContain('[1] https://www.wallpaper.com/fashion/loewe-ss21');
    expect(prompt).toMatch(/copied exactly from the source list/);
    expect(prompt).toContain('A box [1].');
  });
});
