// The listening room, the second home page: its mix, queue and Spotify player are worked out here
// so the page only arranges panels. Nothing here plays audio; Spotify's own player does.
import type { Genre } from './genre-shapes';
import type { RunwaySong } from './runway-songs';
import type { WishItem } from './wishlist';

/** A song the player bar can hold. `art` is empty for a runway song, which has no cover in the room. `genres` files it in
 *  the shape lexicon, which draws the mix's thumbnail. */
export type MixSong = { caption: string; title: string; artist: string; art: string; alt: string; link: string; genres?: readonly Genre[] };

/** The featured songs that carry a Spotify link, split from "Title — Artist" captions. The film stays out. */
export function toMix(songs: readonly { caption: string; image: string; alt: string; link?: string; genres?: readonly Genre[] }[]): MixSong[] {
  return songs.flatMap(s => {
    const [title, artist] = s.caption.split(' — ');
    return s.link && title && artist ? [{ caption: s.caption, title, artist, art: s.image, alt: s.alt, link: s.link, ...(s.genres ? { genres: s.genres } : {}) }] : [];
  });
}

/** A Runway Songs track for the player bar. The designers' portraits stay on Runway Songs, where they're credited. */
export function fromRunway(song: RunwaySong): MixSong {
  const show = `${song.house} ${song.season} ${song.year}`;
  return { caption: `${song.name} — ${song.artist}`, title: song.name, artist: song.artist, art: '', alt: show, link: song.spotifyUrl };
}

/** Spotify's embedded player for a track link, or null when the link isn't an open.spotify.com track. */
export function spotifyEmbed(link: string): string | null {
  const id = /^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})(?:[?#]|$)/.exec(link)?.[1];
  return id ? `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0` : null;
}

/** The song `by` places from `index`, wrapping round the mix. */
export const step = (length: number, index: number, by: number) => (((index + by) % length) + length) % length;

/** The Want List row for a piece or song, matched the way the Want List itself spots duplicates. */
export const findWish = (items: readonly WishItem[], kind: WishItem['kind'], name: string, from?: string) =>
  items.find(i => i.kind === kind && i.name === name && i.from === from);
