import { describe, expect, it } from 'vitest';
import { archiveSongs, spotifyTrackId, withArchive } from './runway-archive';
import type { RunwaySong } from './runway-songs';

const link = (id: string) => ({ sys: { type: 'Link', linkType: 'Entry', id } });
const looks = Array.from({ length: 6 }, (_, k) => `https://www.tag-walk.com/en/look/24826${k}?type=woman&designer=prada`);

// A Content Delivery API reply for entries of runwaySong with include=3.
const reply = {
  items: [
    { sys: { id: 'later', createdAt: '2026-10-02T00:00:00Z' }, fields: { title: 'Wake Up', artist: 'Mad Season', category: 'D', spotify: 'spotify:track:5xhQOnyRJfRywbEwpkgoTy', show: link('resort') } },
    { sys: { id: 'first', createdAt: '2026-10-03T00:00:00Z' }, fields: { title: 'Sin Thetik', version: 'Prada SS21 Womenswear Version', artist: 'Plastikman', category: 'A', order: 1, spotify: 'https://open.spotify.com/track/4FHSuYWyoH9EsFalVIEaOC?si=abc', show: link('ss21') } },
    { sys: { id: 'no-show', createdAt: '2026-10-01T00:00:00Z' }, fields: { title: 'Draft', artist: 'Someone', category: 'B', spotify: '1JJwRgKGT07bDCllHXi3j2' } },
    { sys: { id: 'bad-category', createdAt: '2026-10-01T00:00:00Z' }, fields: { title: 'Odd', artist: 'Someone', category: 'E', spotify: '1JJwRgKGT07bDCllHXi3j2', show: link('ss21') } },
  ],
  includes: {
    Entry: [
      { sys: { id: 'ss21' }, fields: { name: 'Prada SS21 Womenswear', house: 'Prada', season: 'Spring/Summer', year: 2021, designers: [link('prada'), link('simons')], looks: [...looks, 'not a link'] } },
      { sys: { id: 'resort' }, fields: { name: 'Prada Resort 2019', house: 'Prada', season: 'Resort', year: 2019, designers: [link('prada'), link('missing')] } },
      { sys: { id: 'prada' }, fields: { name: 'Miuccia Prada', wikipedia: 'https://en.wikipedia.org/wiki/Miuccia_Prada', photo: { sys: { type: 'Link', linkType: 'Asset', id: 'prada-photo' } }, photoCredit: 'Cory M. Grenier', photoLicence: 'CC BY-SA 2.0' } },
      { sys: { id: 'simons' }, fields: { name: 'Raf Simons', wikipedia: 'https://en.wikipedia.org/wiki/Raf_Simons' } },
    ],
    Asset: [{ sys: { id: 'prada-photo' }, fields: { file: { url: '//images.ctfassets.net/space/prada.jpg' } } }],
  },
};

describe('Runway Music Archive', () => {
  it('reads a Spotify track from a link, a URI or the bare id', () => {
    expect(spotifyTrackId('https://open.spotify.com/intl-fr/track/4FHSuYWyoH9EsFalVIEaOC?si=x')).toBe('4FHSuYWyoH9EsFalVIEaOC');
    expect(spotifyTrackId('spotify:track:4FHSuYWyoH9EsFalVIEaOC')).toBe('4FHSuYWyoH9EsFalVIEaOC');
    expect(spotifyTrackId(' 4FHSuYWyoH9EsFalVIEaOC ')).toBe('4FHSuYWyoH9EsFalVIEaOC');
    expect(spotifyTrackId('https://open.spotify.com/album/4FHSuYWyoH9EsFalVIEaOC')).toBeNull();
  });

  it('turns published songs into player songs, ordered, skipping unfinished ones', () => {
    const songs = archiveSongs(reply);
    expect(songs.map(song => song.id)).toEqual(['archive-first', 'archive-later']);
    expect(songs[0]).toMatchObject({
      name: 'Sin Thetik', version: 'Prada SS21 Womenswear Version', artist: 'Plastikman', house: 'Prada', season: 'Spring/Summer', year: 2021,
      category: 'A', spotifyUri: 'spotify:track:4FHSuYWyoH9EsFalVIEaOC', spotifyUrl: 'https://open.spotify.com/track/4FHSuYWyoH9EsFalVIEaOC',
      looks: looks.slice(0, 5),
    });
    expect(songs[0]?.designers).toEqual([
      { name: 'Miuccia Prada', wikipedia: 'https://en.wikipedia.org/wiki/Miuccia_Prada', photo: { src: 'https://images.ctfassets.net/space/prada.jpg', credit: 'Cory M. Grenier', licence: 'CC BY-SA 2.0', source: null } },
      { name: 'Raf Simons', wikipedia: 'https://en.wikipedia.org/wiki/Raf_Simons', photo: null },
    ]);
    expect(songs[1]).toMatchObject({ version: null, looks: [], designers: [{ name: 'Miuccia Prada' }] });
  });

  it('reads nothing from an empty or broken reply', () => {
    expect(archiveSongs(null)).toEqual([]);
    expect(archiveSongs({ items: 'nope' })).toEqual([]);
  });

  it('lets an archive song stand in for the same track and adds the rest after', () => {
    const song = (id: string, uri: string): RunwaySong => ({
      id, name: id, version: null, artist: 'A', house: 'H', season: 'S', year: 2020, designers: [], category: 'A', spotifyUri: uri, spotifyUrl: '', looks: [],
    });
    const queued = [song('sin-thetik', 'spotify:track:1'), song('runway', 'spotify:track:2')];
    const archive = [{ ...song('archive-a', 'spotify:track:1'), looks: ['https://www.tag-walk.com/en/look/1'] }, song('archive-b', 'spotify:track:3'), song('archive-c', 'spotify:track:3')];
    expect(withArchive(queued, archive).map(s => [s.id, s.spotifyUri, s.looks.length])).toEqual([
      ['sin-thetik', 'spotify:track:1', 1], ['runway', 'spotify:track:2', 0], ['archive-b', 'spotify:track:3', 0],
    ]);
  });
});
