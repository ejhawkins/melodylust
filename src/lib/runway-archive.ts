// Runway Music Archive: songs entered in Contentful (scripts/contentful/runway-music-archive.cjs is the model),
// turned into player songs and merged with the sampler's. Pure and browser-safe so it's tested without a space.

import type { CategoryId } from './runway-sampler';
import type { Designer, RunwaySong } from './runway-songs';

type Sys = { id?: string; createdAt?: string };
type Entry = { sys?: Sys; fields?: Record<string, unknown> };
type Asset = { sys?: Sys; fields?: { file?: { url?: unknown } } };
type Payload = { items?: Entry[]; includes?: { Entry?: Entry[]; Asset?: Asset[] } };

const CATEGORIES: readonly string[] = ['A', 'B', 'C', 'D'] satisfies CategoryId[];
const LOOKS = 5;

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const link = (value: unknown) => { const url = text(value); return url && /^https:\/\/\S+$/.test(url) ? url : null; };
const list = (value: unknown) => (Array.isArray(value) ? value : []);
const linkId = (value: unknown) => text((value as Entry | null)?.sys?.id);

/** The 22-character track id from a Spotify link, URI or the bare id. */
export function spotifyTrackId(value: string) {
  return /(?:^|track[/:])([A-Za-z0-9]{22})(?:$|[?#/])/.exec(value.trim())?.[1] ?? null;
}

/**
 * Published songs from a Content Delivery API reply (entries of runwaySong with include=3), lowest Order first and
 * then oldest. A song is skipped until it has its title, artist, category, Spotify track and a show with house, season
 * and year; a designer without a name or Wikipedia link is left off.
 */
export function archiveSongs(payload: unknown): RunwaySong[] {
  const { items, includes } = (payload ?? {}) as Payload;
  const entries = new Map([...list(includes?.Entry), ...list(items)].map((entry: Entry) => [entry.sys?.id, entry]));
  const assets = new Map(list(includes?.Asset).map((asset: Asset) => [asset.sys?.id, asset]));

  const designer = (value: unknown): Designer[] => {
    const fields = entries.get(linkId(value) ?? '')?.fields ?? {};
    const name = text(fields['name']);
    const wikipedia = link(fields['wikipedia']);
    if (!name || !wikipedia) return [];
    // Contentful serves asset files protocol-relative ("//images.ctfassets.net/…").
    const file = text(assets.get(linkId(fields['photo']) ?? '')?.fields?.file?.url);
    const src = file ? (file.startsWith('//') ? `https:${file}` : file) : null;
    return [{
      name, wikipedia,
      photo: src ? { src, credit: text(fields['photoCredit']), licence: text(fields['photoLicence']), source: link(fields['photoSource']) } : null,
    }];
  };

  return list(items).flatMap((entry: Entry) => {
    const fields = entry.fields ?? {};
    const show = entries.get(linkId(fields['show']) ?? '')?.fields;
    const id = text(entry.sys?.id);
    const name = text(fields['title']);
    const artist = text(fields['artist']);
    const category = text(fields['category']);
    const trackId = spotifyTrackId(text(fields['spotify']) ?? '');
    const house = text(show?.['house']);
    const season = text(show?.['season']);
    const year = show?.['year'];
    if (!id || !name || !artist || !category || !CATEGORIES.includes(category) || !trackId || !house || !season || typeof year !== 'number') return [];
    const order = typeof fields['order'] === 'number' ? fields['order'] : Infinity;
    return [{
      order, createdAt: entry.sys?.createdAt ?? '',
      song: {
        id: `archive-${id}`, name, version: text(fields['version']), artist, house, season, year,
        designers: list(show?.['designers']).flatMap(designer), category: category as CategoryId,
        spotifyUri: `spotify:track:${trackId}`, spotifyUrl: `https://open.spotify.com/track/${trackId}`,
        looks: list(show?.['looks']).flatMap(look => link(look) ?? []).slice(0, LOOKS),
      } satisfies RunwaySong,
    }];
  })
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map(({ song }) => song);
}

/**
 * The sampler's running order with the archive's songs. An archive song for a track already queued takes its place
 * (keeping the queued id, so saves stay); the rest follow in the archive's order, each track once.
 */
export function withArchive(songs: RunwaySong[], archive: RunwaySong[]): RunwaySong[] {
  const archived = new Map<string, RunwaySong>();
  for (const song of archive) if (!archived.has(song.spotifyUri)) archived.set(song.spotifyUri, song);
  const queued = new Set(songs.map(song => song.spotifyUri));
  return [
    ...songs.map(song => { const entry = archived.get(song.spotifyUri); return entry ? { ...entry, id: song.id } : song; }),
    ...[...archived.values()].filter(song => !queued.has(song.spotifyUri)),
  ];
}
