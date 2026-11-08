import { describe, expect, it } from 'vitest';
import { findWish, fromRunway, spotifyEmbed, step, toMix } from './listening-room';
import type { RunwaySong } from './runway-songs';
import type { WishItem } from './wishlist';

describe('listening room', () => {
  it('keeps the songs with a Spotify link and splits their captions', () => {
    const mix = toMix([
      { caption: "Day 'N' Nite — Kid Cudi", image: 'cudi.jpg', alt: 'Day N Nite art', link: 'https://open.spotify.com/track/6ouTGbETM7ZdID1eMXZJde' },
      { caption: 'The cover story', image: 'film.jpg', alt: 'A film still' },
      { caption: 'Fashion Week — Wale', image: 'wale.jpg', alt: 'Fashion Week art', link: 'https://open.spotify.com/track/0Vtvich3vkhne7Pzum3tXF' },
    ]);
    expect(mix.map(s => [s.title, s.artist])).toEqual([["Day 'N' Nite", 'Kid Cudi'], ['Fashion Week', 'Wale']]);
    expect(mix[0]?.caption).toBe("Day 'N' Nite — Kid Cudi");
  });

  it('only embeds open.spotify.com track links', () => {
    expect(spotifyEmbed('https://open.spotify.com/track/6ouTGbETM7ZdID1eMXZJde')).toBe('https://open.spotify.com/embed/track/6ouTGbETM7ZdID1eMXZJde?utm_source=generator&theme=0');
    expect(spotifyEmbed('https://open.spotify.com/track/6ouTGbETM7ZdID1eMXZJde?si=abc')).toContain('/embed/track/6ouTGbETM7ZdID1eMXZJde');
    expect(spotifyEmbed('https://open.spotify.com/album/6ouTGbETM7ZdID1eMXZJde')).toBeNull();
    expect(spotifyEmbed('https://evil.example/track/6ouTGbETM7ZdID1eMXZJde')).toBeNull();
    expect(spotifyEmbed('https://open.spotify.com/track/short')).toBeNull();
  });

  it('hands a runway song to the player with its Spotify link and no cover', () => {
    const song: RunwaySong = {
      id: 'loewe-ss21', name: 'Spem in alium', version: null, artist: 'Thomas Tallis · The Tallis Scholars', house: 'Loewe', season: 'Spring/Summer', year: 2021,
      designers: [], category: 'D', spotifyUri: 'spotify:track:4XAvUh7v5cy7I5YIewJCCR', spotifyUrl: 'https://open.spotify.com/track/4XAvUh7v5cy7I5YIewJCCR', looks: [],
    };
    const mixed = fromRunway(song);
    expect(mixed).toMatchObject({ caption: 'Spem in alium — Thomas Tallis · The Tallis Scholars', title: 'Spem in alium', art: '', alt: 'Loewe Spring/Summer 2021' });
    expect(spotifyEmbed(mixed.link)).toContain('/embed/track/4XAvUh7v5cy7I5YIewJCCR');
  });

  it('steps round the mix in both directions', () => {
    expect(step(6, 0, -1)).toBe(5);
    expect(step(6, 5, 1)).toBe(0);
  });

  it('finds a saved piece only under the song it was saved from', () => {
    const items: WishItem[] = [
      { id: '1', kind: 'piece', name: 'Opera gloves', detail: '$48', link: '', note: '', from: 'Nicole Kidman — ADÉLA' },
      { id: '2', kind: 'song', name: 'Nicole Kidman — ADÉLA', detail: '', link: 'https://open.spotify.com/track/x', note: '' },
    ];
    expect(findWish(items, 'piece', 'Opera gloves', 'Nicole Kidman — ADÉLA')?.id).toBe('1');
    expect(findWish(items, 'piece', 'Opera gloves', 'Fashion Week — Wale')).toBeUndefined();
    expect(findWish(items, 'song', 'Nicole Kidman — ADÉLA')?.id).toBe('2');
  });
});
