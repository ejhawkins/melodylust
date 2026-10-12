// @vitest-environment node
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { emptyStyleProfile, type StyleGenre } from './style-profile';
import { checkStyleNets, type StyleNetRow } from './style-nets';
import { looksInWindow, scorePairing, styleProfileV2Schema, upgradeProfile, type PairingAnswers } from './taste-pairing';

const today = new Date('2026-10-12T00:00:00Z');
const net = (style: string, signalType: StyleNetRow['signalType'], signalValue: string, season = 'AW26'): StyleNetRow =>
  ({ style, season, signalType, signalValue, weight: 2, evidenceIds: [], notes: '' });
const answers = (overrides: Partial<PairingAnswers>): PairingAnswers =>
  ({ genres: [], artistIds: [], songGenres: [], looks: [], fineTune: [], ...overrides });
const suede: StyleGenre[] = ['Grunge', 'Quiet Luxury'], offDuty: StyleGenre[] = ['Y2K', 'Grunge'], lace: StyleGenre[] = ['Soft Glam', 'Y2K'];
const grungeNets = [net('Grunge', 'fit', 'Oversized'), net('Grunge', 'detail', 'Fringe'), net('Grunge', 'music_genre', 'Rock')];

describe('scorePairing', () => {
  it('scores the worked example on the flow page as Indie × Grunge', () => {
    const result = scorePairing({
      answers: answers({ genres: ['Indie', 'Rock'], looks: [suede, suede, offDuty, lace], fineTune: ['Oversized', 'Fringe'] }),
      nets: grungeNets, artistGenres: {}, today,
    });
    // Grunge 12, Quiet Luxury 6, Y2K 6, Soft Glam 3: Y2K is runner-up on the style order.
    expect(result).toEqual({ sound: 'Indie', soundRunnerUp: 'Rock', style: 'Grunge', styleRunnerUp: 'Y2K', confidence: 6 / 27, needsTieBreak: false, blend: false });
  });

  it('gives a sound tie to the genre picked first', () => {
    expect(scorePairing({ answers: answers({ genres: ['Rock', 'Indie'] }), nets: [], artistGenres: {}, today }).sound).toBe('Rock');
  });

  it('adds artist and song genres to the sound', () => {
    const result = scorePairing({ answers: answers({ genres: ['Pop'], artistIds: ['a1'], songGenres: ['Electronic'] }), nets: [], artistGenres: { a1: ['Electronic', 'Not a genre'] }, today });
    // Electronic 2 + 1 ties Pop's 3; Pop was picked, so it keeps the tie.
    expect([result.sound, result.soundRunnerUp]).toEqual(['Pop', 'Electronic']);
  });

  it('counts a chip once per style and only from nets in the current seasons', () => {
    const nets = [net('Grunge', 'fabric', 'Suede'), net('Grunge', 'fabric', 'suede', 'SS27'), net('Soft Glam', 'fabric', 'Suede', 'SS24')];
    const result = scorePairing({ answers: answers({ fineTune: ['Suede', 'SUEDE'] }), nets, artistGenres: {}, today });
    expect([result.style, result.styleRunnerUp, result.confidence]).toEqual(['Grunge', null, 1]);
  });

  it('asks for a tie-break when the call is close, and blends if it stays close', () => {
    const close = answers({ looks: [suede, offDuty, lace] });
    expect(scorePairing({ answers: close, nets: [], artistGenres: {}, today })).toMatchObject({ style: 'Y2K', styleRunnerUp: 'Grunge', needsTieBreak: true, blend: false });
    const broken = scorePairing({ answers: { ...close, tieBreak: 'Grunge' }, nets: [], artistGenres: {}, today });
    // Grunge 9 against Y2K 6 out of 21 is still under the bar, so the reveal shows a blend.
    expect(broken).toMatchObject({ style: 'Grunge', styleRunnerUp: 'Y2K', needsTieBreak: false, blend: true, confidence: 3 / 21 });
    const clear = scorePairing({ answers: { ...close, looks: [...close.looks, suede], tieBreak: 'Grunge' }, nets: [], artistGenres: {}, today });
    expect(clear).toMatchObject({ style: 'Grunge', blend: false });
  });

  it('shows the sound alone when there are no style votes, and nothing when there are no answers', () => {
    expect(scorePairing({ answers: answers({ genres: ['Jazz'] }), nets: [], artistGenres: {}, today }))
      .toEqual({ sound: 'Jazz', soundRunnerUp: null, style: null, styleRunnerUp: null, confidence: 0, needsTieBreak: false, blend: false });
    expect(scorePairing({ answers: answers({}), nets: [], artistGenres: {}, today }).sound).toBeNull();
  });
});

describe('looksInWindow', () => {
  const publishedAt = { '1': '2026-09-01', '2': '2026-09-20', '3': '2026-10-01', '4': '2025-01-10', '5': '2025-02-10', '6': '2025-03-10' };
  const looks = [
    { id: 'old', season: 'AW25', evidenceIds: ['1', '2', '3'] },
    { id: 'unsourced', season: 'AW26', evidenceIds: [] },
    { id: 'faded', season: 'AW26', evidenceIds: ['4', '5', '6'] },
    { id: 'runway', season: 'SS27', evidenceIds: ['1', '2', '3'] },
    { id: 'store', season: 'AW26', evidenceIds: ['1', '2', '3', 'missing'] },
  ];

  it('keeps the current seasons, drops dated looks and leads with the earliest trend', () => {
    expect(looksInWindow({ looks, publishedAt, today }).map(({ id, lane, stage }) => [id, lane, stage])).toEqual([
      ['store', 'in-store', 'early'],
      ['runway', 'first-look', 'early'],
      ['unsourced', 'in-store', 'new-to-us'],
    ]);
  });
});

describe('upgradeProfile', () => {
  it('works out a pairing from v1 answers and the nets', () => {
    const v1 = { ...emptyStyleProfile(), music: ['Rock'], fit: ['Oversized'] };
    const v2 = upgradeProfile(v1, grungeNets, today);
    expect(v2.pairing).toEqual({ sound: 'Rock', style: 'Grunge', runnerUp: null, confidence: 1, chosenBy: 'quiz' });
    expect(v2.fit).toEqual(['Oversized']);
    expect(styleProfileV2Schema.parse(v2)).toEqual(v2);
  });

  it('leaves the pairing empty for an empty profile', () => {
    expect(upgradeProfile(emptyStyleProfile(), grungeNets, today).pairing).toBeNull();
  });

  it('runs on the real tracker and style nets', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const tracker = Papa.parse<Record<string, string>>(read('../../data/articles-tracker.csv'), { header: true, skipEmptyLines: 'greedy' }).data;
    const { rows } = checkStyleNets(read('../../data/style-nets.csv'), tracker.map(row => row['ID'] ?? ''));
    const v1 = { ...emptyStyleProfile(), music: ['Rock'], pattern: ['Plaid'], details: ['Studded belt'] };
    // The starter nets are all SS24, outside the current window, so they add no style points yet.
    expect(upgradeProfile(v1, rows, today).pairing).toEqual({ sound: 'Rock', style: null, runnerUp: null, confidence: 0, chosenBy: 'quiz' });
  });
});
