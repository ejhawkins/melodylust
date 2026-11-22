// The home page's listen shelf: runway songs, Thom Browne's featured first, then the sampler's other sourced show tracks.
// Pure and browser-safe, so the order and the hand-off to the Listening Room are unit-tested.
import type { MixSong } from './listening-room';
import { SAMPLER_TRACKS } from './runway-sampler';

/** A shelf song: a player song plus the show it walked in. `still` is a frame of the show, empty when there's none. */
export type ShelfSong = MixSong & { house: string; show: string; still: string; featured?: boolean };

/** Thom Browne FW25 (11 Feb 2025, The Shed, New York): "Bird Song" is on the soundtrack Ben Brunnemer made for the show,
 *  as his own upload lists it (https://soundcloud.com/benbrunnemer/thom-browne-fw25). The still is from the full show
 *  on FF Channel, the same film as the home page's runway stack. */
export const THOM_BROWNE_FEATURED: ShelfSong = {
  caption: 'Bird Song — Lene Lovich', title: 'Bird Song', artist: 'Lene Lovich', art: '',
  alt: 'Thom Browne Fall/Winter 2025 runway', link: 'https://open.spotify.com/track/7cUViSSu09qI9n6HGrmDby',
  house: 'Thom Browne', show: 'Fall/Winter 2025 · The Shed, New York', still: 'https://i.ytimg.com/vi/CyKFxnAo1S0/maxresdefault.jpg', featured: true,
};

/** The shelf's running order: the featured Thom Browne song, then every sourced sampler track in playlist order. */
export function runwayShelf(): ShelfSong[] {
  const rest = SAMPLER_TRACKS.map(t => ({
    caption: `${t.title} — ${t.artist}`, title: t.title, artist: t.artist, art: '', alt: `${t.house} ${t.show}`,
    link: `https://open.spotify.com/track/${t.spotifyId}`, house: t.house, show: t.show, still: '',
  }));
  return [THOM_BROWNE_FEATURED, ...rest];
}

/** The Listening Room's address holding a shelf song, by its Spotify link. */
export function runwayRoomLink(song: { link: string }): string {
  return `/?runway=${encodeURIComponent(song.link)}`;
}

/** Which shelf song the address's `?runway=` names, or -1. */
export function runwayFromSearch(search: string, songs: readonly { link: string }[]): number {
  const link = new URLSearchParams(search).get('runway');
  return link ? songs.findIndex(s => s.link === link) : -1;
}
