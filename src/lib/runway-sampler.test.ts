import { describe, expect, it } from 'vitest';
import {
  bandFit, bandFitLabel, emptySamplerEdits, MAX_PICKS, parseBpm, readSamplerEdits, resolveSampler, samplerCsv,
  SAMPLER_SOURCES, SAMPLER_TRACKS, withManualTrack, withManualTrackUpdate, withoutManualTrack, withoutTrackEdit, withTrackEdit,
} from './runway-sampler';

const pick = { title: 'Own pick', artist: 'Someone', show: 'My runway', category: 'B' as const, bpm: 124, sourceUrl: null, note: '' };

describe('sourced catalogue', () => {
  it('cites a known source and a Spotify track for every track', () => {
    const ids = new Set(SAMPLER_SOURCES.map(source => source.id));
    for (const track of SAMPLER_TRACKS) {
      expect(track.sourceIds.length, track.id).toBeGreaterThan(0);
      for (const id of track.sourceIds) expect(ids.has(id), `${track.id} → ${id}`).toBe(true);
      expect(track.spotifyId, track.id).toMatch(/^[A-Za-z0-9]{22}$/);
    }
    expect(new Set(SAMPLER_TRACKS.map(track => track.id)).size).toBe(SAMPLER_TRACKS.length);
  });

  it('resolves to the playlist order with nothing edited', () => {
    const rows = resolveSampler(emptySamplerEdits());
    expect(rows.map(row => row.id)).toEqual(SAMPLER_TRACKS.map(track => track.id));
    expect(rows.every(row => row.origin === 'sourced' && row.edited.length === 0 && !row.hidden)).toBe(true);
    expect(rows[0]!.spotifyUrl).toBe('https://open.spotify.com/track/4XAvUh7v5cy7I5YIewJCCR');
  });
});

describe('tempo bands', () => {
  it('checks a tempo against its category band', () => {
    expect(bandFit('B', 128)).toEqual({ kind: 'over', by: 2 });
    expect(bandFit('A', 113)).toEqual({ kind: 'under', by: 15 });
    expect(bandFit('C', 116)).toEqual({ kind: 'in' });
    expect(bandFit('A', null)).toEqual({ kind: 'free' });
    expect(bandFit('D', 87)).toEqual({ kind: 'open' });
    expect(bandFitLabel({ kind: 'over', by: 2 })).toBe('2 over band');
  });

  it('reads typed tempos, treating blank as free time', () => {
    expect(parseBpm('')).toBeNull();
    expect(parseBpm(' 119.6 ')).toBe(120);
    expect(parseBpm('fast')).toBe('invalid');
    expect(parseBpm('400')).toBe('invalid');
  });
});

describe('manual edits', () => {
  it('overrides a sourced track and marks what changed', () => {
    const edits = withTrackEdit(emptySamplerEdits(), 'sin-thetik', { bpm: 128, note: 'Counts double-time to me' });
    const row = resolveSampler(edits).find(r => r.id === 'sin-thetik')!;
    expect(row).toMatchObject({ bpm: 128, edited: ['bpm'], note: 'Counts double-time to me', fit: { kind: 'in' }, bpmNote: null });
  });

  it('drops an override that matches the sourced value, and resets cleanly', () => {
    let edits = withTrackEdit(emptySamplerEdits(), 'work-bitch', { category: 'A' });
    expect(resolveSampler(edits).find(r => r.id === 'work-bitch')!.edited).toEqual(['category']);
    edits = withTrackEdit(edits, 'work-bitch', { category: 'B' });
    expect(edits.edits).toEqual({});
    edits = withTrackEdit(edits, 'mad-world', { hidden: true });
    expect(resolveSampler(edits).find(r => r.id === 'mad-world')!.hidden).toBe(true);
    expect(withoutTrackEdit(edits, 'mad-world').edits).toEqual({});
  });

  it('can set a sourced tempo to free time', () => {
    const row = resolveSampler(withTrackEdit(emptySamplerEdits(), 'runway', { bpm: null })).find(r => r.id === 'runway')!;
    expect(row).toMatchObject({ bpm: null, edited: ['bpm'], fit: { kind: 'free' } });
  });

  it('appends, updates and removes the reader’s own picks', () => {
    let edits = withManualTrack(emptySamplerEdits(), pick, 'manual-1');
    let rows = resolveSampler(edits);
    expect(rows.at(-1)).toMatchObject({ id: 'manual-1', origin: 'manual', sources: [], sourceUrl: null, fit: { kind: 'in' } });
    expect(rows.at(-1)!.spotifyUrl).toBe('https://open.spotify.com/search/Own%20pick%20Someone');
    edits = withManualTrackUpdate(edits, 'manual-1', { category: 'C', bpm: 140 });
    rows = resolveSampler(edits);
    expect(rows.at(-1)).toMatchObject({ category: 'C', bpm: 140, fit: { kind: 'over', by: 10 } });
    edits = withTrackEdit(edits, 'manual-1', { hidden: true });
    expect(withoutManualTrack(edits, 'manual-1')).toEqual(emptySamplerEdits());
  });

  it('stops at MAX_PICKS rather than storing edits that would no longer read back', () => {
    let edits = emptySamplerEdits();
    for (let k = 0; k < MAX_PICKS; k += 1) edits = withManualTrack(edits, pick, `manual-${k}`);
    expect(withManualTrack(edits, pick, 'manual-extra')).toBe(edits);
    expect(readSamplerEdits(JSON.parse(JSON.stringify(edits))).added).toHaveLength(MAX_PICKS);
  });

  it('only accepts https source links on a manual pick', () => {
    expect(() => withManualTrack(emptySamplerEdits(), { ...pick, sourceUrl: 'http://example.com/a' })).toThrow();
    expect(withManualTrack(emptySamplerEdits(), { ...pick, sourceUrl: 'https://example.com/a' }).added).toHaveLength(1);
  });

  it('starts over when stored edits are unreadable', () => {
    expect(readSamplerEdits({ edits: { x: { bpm: 'fast' } }, added: [] })).toEqual(emptySamplerEdits());
    expect(readSamplerEdits(null)).toEqual(emptySamplerEdits());
  });
});

describe('CSV export', () => {
  it('lists sources for sourced tracks and flags unsourced manual picks', () => {
    const csv = samplerCsv(resolveSampler(withManualTrack(emptySamplerEdits(), pick, 'manual-1')));
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Order,Category,Track,Artist,BPM,Band fit,House,Show,Origin,Edited,Sources,Spotify,Note');
    expect(lines[1]).toContain('"free time"');
    expect(lines[1]).toContain('SRC-010 https://');
    expect(lines.at(-1)).toContain('"manual"');
    expect(lines.at(-1)).toContain('"unsourced"');
  });
});
