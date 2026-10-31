import { describe, expect, it } from 'vitest';
import { emptySamplerEdits, resolveSampler, SAMPLER_TRACKS, withManualTrack, withTrackEdit } from './runway-sampler';
import { clock, nextIndex, previousIndex, runwaySongs, SHOWS, splitTitle, titleStep } from './runway-songs';

describe('Runway Songs queue', () => {
  it('gives every sourced track a season, year and designer', () => {
    expect(SAMPLER_TRACKS.filter(track => !SHOWS[track.id]).map(track => track.id)).toEqual([]);
  });

  it('plays the sourced running order as Spotify tracks, with the release parenthetical split off', () => {
    const songs = runwaySongs(resolveSampler(emptySamplerEdits()));
    expect(songs).toHaveLength(12);
    expect(songs[0]).toMatchObject({ name: 'Spem in alium', house: 'Loewe', season: 'Spring/Summer', year: 2021, category: 'D', spotifyUri: 'spotify:track:4XAvUh7v5cy7I5YIewJCCR' });
    expect(songs.find(song => song.id === 'gimme-more-bfrnd')).toMatchObject({ name: 'Gimme More', version: 'BFRND Remix' });
  });

  it('follows the reader’s edits: hidden tracks drop out, moved categories carry over, manual picks are skipped', () => {
    let edits = withTrackEdit(emptySamplerEdits(), 'spem-in-alium', { hidden: true });
    edits = withTrackEdit(edits, 'runway', { category: 'C' });
    edits = withManualTrack(edits, { title: 'Pick', artist: 'Someone', show: '', category: 'B', bpm: null, sourceUrl: null, note: '' });
    const songs = runwaySongs(resolveSampler(edits));
    expect(songs).toHaveLength(11);
    expect(songs[0]?.id).toBe('sin-thetik');
    expect(songs.find(song => song.id === 'runway')?.category).toBe('C');
  });

  it('splits only a trailing parenthetical', () => {
    expect(splitTitle('Sin Thetik (Prada SS21 Womenswear Version)')).toEqual({ name: 'Sin Thetik', version: 'Prada SS21 Womenswear Version' });
    expect(splitTitle('Love in E Minor')).toEqual({ name: 'Love in E Minor', version: null });
  });

  it('steps the headline down until no word breaks and it sets in two lines', () => {
    expect(titleStep('In the Still')).toBe(0);
    expect(titleStep('Mad World')).toBe(1);
    expect(titleStep('Runway')).toBe(2); // one word, too wide for the top two sizes
    expect(titleStep('Hello Operator')).toBe(3);
    expect(titleStep('Narkosis / Spektre')).toBe(3);
  });

  it('wraps next and previous, and shuffle never repeats the current song', () => {
    expect(nextIndex(11, 12, false)).toBe(0);
    expect(previousIndex(0, 12)).toBe(11);
    expect(nextIndex(3, 12, true, () => 0.25)).toBe(2);
    expect(nextIndex(3, 12, true, () => 0.3)).toBe(4);
    expect(nextIndex(0, 1, true)).toBe(0);
  });

  it('formats playback time', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(272_400)).toBe('4:32');
  });
});
