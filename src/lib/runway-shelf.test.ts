import { describe, expect, it } from 'vitest';
import { SAMPLER_TRACKS } from './runway-sampler';
import { runwayFromSearch, runwayRoomLink, runwayShelf, THOM_BROWNE_FEATURED } from './runway-shelf';

describe('the home listen shelf', () => {
  const songs = runwayShelf();
  it('opens on the featured Thom Browne song, then the other runway tracks', () => {
    expect(songs[0]).toBe(THOM_BROWNE_FEATURED);
    expect(songs[0]?.house).toBe('Thom Browne');
    expect(songs.slice(1).map(s => s.house)).toEqual(SAMPLER_TRACKS.map(t => t.house));
    expect(songs.every(s => /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(s.link))).toBe(true);
  });
  it('hands a song to the Listening Room and reads it back', () => {
    const third = songs[2]!;
    expect(runwayFromSearch(runwayRoomLink(third).slice(1), songs)).toBe(2);
    expect(runwayFromSearch('', songs)).toBe(-1);
    expect(runwayFromSearch('?runway=https%3A%2F%2Fopen.spotify.com%2Ftrack%2Fnope', songs)).toBe(-1);
  });
});
