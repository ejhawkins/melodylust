import { describe, expect, it } from 'vitest';
import { recommendSongs, songCatalog, spotifySearchUrl } from './song-recommendations';

const usher = { kind: 'artist', name: 'Usher' };
const titles = (picks: ReturnType<typeof recommendSongs>) => picks.map(pick => pick.song.title);

describe('song picks', () => {
  it('recommends "Yeah!" for Off-White × Usher, with its reasons', () => {
    const [top, ...rest] = recommendSongs({ music: usher, designer: 'Off-White', profile: { music: ['R&B', 'Hip-hop'] } });
    expect(top?.song.title).toBe('Yeah!');
    expect(top?.reasons).toEqual([
      'By Usher, the artist you searched',
      'Performed at his 2024 Super Bowl halftime show, where he wore the Off-White crystal biker suit',
      "Fits Off-White's streetwear lane: R&B & Hip-hop",
      'Matches your quiz: R&B & Hip-hop',
    ]);
    expect(rest).toHaveLength(2);
    expect(rest.every(pick => pick.song.artists.includes('Usher'))).toBe(true);
  });

  it('matches the designer however the tracker spells it', () => {
    expect(titles(recommendSongs({ music: usher, designer: 'Off White' }))[0]).toBe('Yeah!');
    expect(titles(recommendSongs({ music: { kind: 'artist', name: 'usher' }, designer: 'off-white' }))[0]).toBe('Yeah!');
  });

  it('lets mood re-rank the rest of the list', () => {
    expect(titles(recommendSongs({ music: usher, designer: 'Off-White', mood: 'Smooth' }))).toEqual(['Yeah!', 'Love in This Club', 'U Got It Bad']);
    expect(titles(recommendSongs({ music: usher, designer: 'Off-White', mood: 'Moody' })).slice(0, 2)).toEqual(['Yeah!', 'Confessions Part II']);
  });

  it('gives each house its own lead song, the same way every time', () => {
    const leads = ['Off White', 'Dolce & Gabbana', 'Jacquie Aiche', 'Alexander McQueen', 'Bianca Saunders']
      .map(designer => titles(recommendSongs({ music: usher, designer }))[0]);
    expect(new Set(leads).size).toBeGreaterThan(1);
    expect(leads[0]).toBe('Yeah!');
    expect(titles(recommendSongs({ music: usher, designer: 'Jacquie Aiche' }))).toEqual(titles(recommendSongs({ music: usher, designer: 'Jacquie Aiche' })));
    expect(recommendSongs({ music: usher, designer: 'Jacquie Aiche' })[0]?.reasons).toContain("Fits Jacquie Aiche's crystal-lit lane: R&B");
  });

  it('puts the searched song first and finds band members', () => {
    expect(titles(recommendSongs({ music: { kind: 'song', name: 'Just a Girl' } }))[0]).toBe('Just a Girl');
    expect(titles(recommendSongs({ music: { kind: 'artist', name: 'Gwen Stefani' }, designer: 'Dr. Martens', mood: 'Rebellious' }))).toEqual(['Just a Girl', "Don't Speak", 'Hollaback Girl']); // lane fit and mood fit tie at 5; the per-house tie-break settles it
  });

  it('answers a genre search from the catalog', () => {
    expect(recommendSongs({ music: { kind: 'genre', name: 'R&B' } }).every(pick => pick.song.genres.includes('R&B'))).toBe(true);
  });

  it('never recommends on mood or quiz taste alone', () => {
    expect(recommendSongs({ mood: 'Hype', profile: { music: ['Pop'], artists: 'Olivia Rodrigo' } })).toEqual([]);
    expect(recommendSongs({ music: { kind: 'artist', name: 'Unknown Artist' }, designer: 'Unknown House', mood: 'Hype' })).toEqual([]);
  });

  it('builds Spotify search links from title and lead artist', () => {
    expect(spotifySearchUrl(songCatalog[0]!)).toBe('https://open.spotify.com/search/Yeah!%20Usher');
  });
});
