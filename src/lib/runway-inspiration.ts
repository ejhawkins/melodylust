// Runway inspiration: after the style quiz, the runway shows that fit the reader's tags, the designers behind them,
// and stacked playlists built only from those shows' soundtracks. Pure and browser-safe, so the matching is tested.
//
// Tag method. Every show carries tags in the quiz's own vocabulary (style-profile.ts), of two kinds:
// - "show" tags read straight off the show: its season and, when the quiz names it, its house.
// - "our read" tags are Melody Lust's interpretation: a track's music genre and a show's aesthetic. They are labelled as
//   ours on the page, apart from the sources, which are the reviews and articles that place each song at each show.
// A show with no source on file is left out: everything shown here roots back to a cited soundtrack.

import { houseShop } from './house-shops';
import { noteId, type NoteSource, type NoteTrack, type RunwayNote } from './runway-notes';
import { SAMPLER_SOURCES, SAMPLER_TRACKS } from './runway-sampler';
import type { Designer, RunwaySong } from './runway-songs';
import type { StyleProfile } from './style-profile';

export type TagKind = 'music' | 'aesthetic' | 'season' | 'brand';
/** "show": read off the show itself. "ours": Melody Lust's read (genre, aesthetic). */
export type TagBasis = 'show' | 'ours';
export type Tag = { kind: TagKind; value: string };
export type ShowTag = Tag & { basis: TagBasis };

export const TAG_KINDS: readonly TagKind[] = ['music', 'aesthetic', 'season', 'brand'];
export const TAG_KIND_LABELS: Record<TagKind, string> = { music: 'Music', aesthetic: 'Aesthetic', season: 'Season', brand: 'House' };
export const tagKey = (tag: Tag) => `${tag.kind}:${tag.value}`;

const norm = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Our read of each runway artist's genre, in the quiz's music vocabulary. Keyed by the artist as the show credits them.
 * Artists that fit none of the quiz's genres (Wagner, Tallis, a gospel choir) are left untagged rather than forced in.
 */
export const ARTIST_GENRES: Record<string, readonly string[]> = {
  'marilyn manson': ['Rock'],
  kraftwerk: ['Electronic'],
  'david bowie': ['Rock'],
  'iggy pop': ['Rock'],
  'nina simone': ['Jazz'],
  'lucky love': ['Pop'],
  adele: ['Pop'],
  'mos def': ['Hip-hop'],
  plastikman: ['Electronic'],
  'britney spears bfrnd': ['Pop', 'Electronic'],
  'britney spears': ['Pop', 'Electronic'],
  'la femme': ['Indie'],
  'r e m': ['Rock', 'Indie'],
  'gary jules': ['Indie'],
  'mad season': ['Rock'],
  'lcd soundsystem': ['Electronic', 'Indie'],
  'the white stripes': ['Rock', 'Indie'],
  'bfrnd gustave rudman': ['Electronic'],
  nigo: ['Hip-hop'],
  'f l y fast life yungstaz': ['Hip-hop'],
  clipse: ['Hip-hop'],
};

/** Our read of a show's aesthetic, in the quiz's vocabulary; only where the reviews make the read plain. Keyed by note id. */
export const SHOW_AESTHETICS: Record<string, readonly string[]> = {
  'thom-browne-fall-winter-2017': ['Preppy'], // grey-flannel tailoring, the house's collegiate uniform
  'wales-bonner-autumn-winter-2024': ['Preppy'], // an ode to Howard University: varsity and tailoring
  'maison-margiela-artisanal-2024': ['Romantic'], // corsetry and moonlit Belle Époque Paris
  'prada-spring-summer-2021': ['Minimalist'], // Prada and Simons' first show: pared-back uniform
};

/** The quiz's season for a show's season, when it names one. Resort and Artisanal don't map. */
export function seasonTag(season: string): string | null {
  const s = season.toLowerCase();
  if (/fall|autumn|winter/.test(s)) return 'Fall / winter';
  if (/spring|summer/.test(s)) return 'Spring / summer';
  return null;
}

/** The quiz's house options a show can match by name. */
const BRANDS = ['Prada', 'Chanel', 'Simone Rocha'];

export const trackGenres = (artist: string) => ARTIST_GENRES[norm(artist)] ?? ARTIST_GENRES[norm(artist.split(/,|·|&|\bfeat\b/i)[0] ?? '')] ?? [];

export function showTags(note: RunwayNote): ShowTag[] {
  const tags: ShowTag[] = [];
  const add = (tag: ShowTag) => { if (!tags.some(t => tagKey(t) === tagKey(tag))) tags.push(tag); };
  for (const track of note.music?.tracks ?? []) for (const genre of trackGenres(track.artist)) add({ kind: 'music', value: genre, basis: 'ours' });
  for (const value of SHOW_AESTHETICS[note.id] ?? []) add({ kind: 'aesthetic', value, basis: 'ours' });
  const season = seasonTag(note.season);
  if (season) add({ kind: 'season', value: season, basis: 'show' });
  const brand = BRANDS.find(b => norm(b) === norm(note.house));
  if (brand) add({ kind: 'brand', value: brand, basis: 'show' });
  return tags;
}

/** The reader's tags from their saved profile, in cloud order. */
export function profileTags(profile: Pick<StyleProfile, 'music' | 'aesthetic' | 'season' | 'brand'>): Tag[] {
  return TAG_KINDS.flatMap(kind => profile[kind].map(value => ({ kind, value })));
}

/** The reviews that place a show's songs: its note's sources, plus the sampler's article for each sampler track. */
export function showSources(note: RunwayNote): NoteSource[] {
  const fromSampler = (note.music?.tracks ?? []).flatMap(track => {
    const sampled = SAMPLER_TRACKS.find(t => track.spotifyId && t.spotifyId === track.spotifyId);
    return (sampled?.sourceIds ?? []).flatMap(id => SAMPLER_SOURCES.filter(s => s.id === id)).map(({ title, url, checked }) => ({ title, url, checked }));
  });
  return [...note.sources, ...fromSampler].filter((s, i, all) => all.findIndex(o => o.url === s.url) === i);
}

export type InspiredTrack = { title: string; artist: string; spotifyId: string | null; genres: readonly string[]; showId: string; show: string };
export type InspiredShow = { note: RunwayNote; label: string; designers: Designer[]; tags: ShowTag[]; matched: Tag[]; sources: NoteSource[]; tracks: InspiredTrack[] };
export type InspiredDesigner = { designer: Designer; shows: string[]; matched: Tag[] };
export type InspiredPlaylist = { id: string; title: string; basis: Tag | null; tracks: InspiredTrack[] };
export type Inspiration = { shows: InspiredShow[]; designers: InspiredDesigner[]; setlist: SetlistRow[]; playlists: InspiredPlaylist[] };

export const showLabel = (note: Pick<RunwayNote, 'house' | 'season' | 'year'>) => `${note.house} ${note.season} ${note.year}`;
const named = (track: NoteTrack): track is NoteTrack & { title: string } => Boolean(track.title);

/** Designers for a show: the room's songs carry portraits; a show only in the notes names them without one. */
function designersFor(note: RunwayNote, songs: readonly RunwaySong[]): Designer[] {
  const fromSongs = songs.filter(song => noteId(song) === note.id).flatMap(song => song.designers);
  const byName = new Map(fromSongs.map(d => [norm(d.name), d]));
  const names = note.designers.length ? note.designers : [note.house];
  return names.map(name => byName.get(norm(name)) ?? { name, wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`, photo: null });
}

/**
 * Designer setlist extras: a song placed at a show not yet written up as a runway note, with only what its sources
 * support. "excerpt" = seen in search results; the part says how firmly each song is placed. From the Hip Hop × Runway
 * lab preview, re-checked 2026-11-27.
 */
export type SetlistExtra = {
  id: string; designer: { name: string; wikipedia: string }; house: string; season: string; year: number; city: string;
  title: string; artist: string; spotifyId: string; part: string; sources: NoteSource[];
};
export const SETLIST_EXTRAS: readonly SetlistExtra[] = [
  {
    id: 'kenzo-fall-winter-2022', designer: { name: 'Nigo', wikipedia: 'https://en.wikipedia.org/wiki/Nigo' },
    house: 'Kenzo', season: 'Fall/Winter', year: 2022, city: 'Paris',
    title: 'Arya', artist: 'Nigo, A$AP Rocky', spotifyId: '5JPtB3Wn3H4nXJhuFtvzak',
    part: 'Lead single of I Know Nigo, the album previewed as the soundtrack of his Kenzo debut; released five days after the show',
    sources: [
      { title: 'Our Generation Music: Nigo previews unreleased music at Kenzo’s Fall/Winter 2022 show', url: 'https://ourgenerationmusic.com/news/nigo-previews-unreleased-music-at-kenzo-menswear-fall-winter-2022-2023-fashion-show/', checked: 'excerpt' },
      { title: 'Universal Music: Nigo presents debut single “Arya” featuring A$AP Rocky', url: 'https://www.universalmusic.ca/press-releases/nigo-presents-debut-single-arya-featuring-aap-rocky', checked: 'excerpt' },
    ],
  },
  {
    id: 'pyer-moss-spring-summer-2019', designer: { name: 'Kerby Jean-Raymond', wikipedia: 'https://en.wikipedia.org/wiki/Kerby_Jean-Raymond' },
    house: 'Pyer Moss', season: 'Spring/Summer', year: 2019, city: 'Brooklyn',
    title: 'Swag Surfin’', artist: 'F.L.Y. (Fast Life Yungstaz)', spotifyId: '2PDI58wt4PEJu2lCyDeIuu',
    part: 'Sung live by a gospel choir at the Weeksville Heritage Center; the link is the studio recording',
    sources: [
      { title: 'Refinery29: Pyer Moss Spring 2019', url: 'https://refinery29.com/en-us/2018/09/209382/pyer-moss-spring-2019-collection', checked: 'excerpt' },
      { title: 'Fashionista: Pyer Moss Spring 2019 review', url: 'https://fashionista.com/2018/09/pyer-moss-spring-2019-review', checked: 'excerpt' },
    ],
  },
  {
    id: 'louis-vuitton-spring-summer-mens-2025', designer: { name: 'Pharrell Williams', wikipedia: 'https://en.wikipedia.org/wiki/Pharrell_Williams' },
    house: 'Louis Vuitton', season: 'Spring/Summer Men’s', year: 2025, city: 'Paris',
    title: 'The Birds Don’t Sing', artist: 'Clipse, John Legend', spotifyId: '6L3i4jdNnk0a9kMT3qIqTG',
    part: 'Premiered at the show as “Birds Don’t Sing”; the released track adds “The”',
    sources: [
      { title: 'Stereogum: a new Clipse song with John Legend debuted at Louis Vuitton', url: 'https://stereogum.com/2268577/preview-a-new-clipse-song-with-john-legend-debuted-at-louis-vuittons-ss-2025-fashion-show/news', checked: 'excerpt' },
      { title: 'Flaunt: Louis Vuitton Men’s Spring-Summer 2025', url: 'https://www.flaunt.com/post/louis-vuitton-mens-spring-summer-2025-collection', checked: 'excerpt' },
    ],
  },
];

/** One row of the designer setlist: a designer, their show and the song that walked with it. */
export type SetlistRow = {
  id: string; designer: Designer; show: string; title: string; artist: string; spotifyId: string | null;
  part: string | null; sources: NoteSource[]; matched: Tag[];
  /** The house's own online store, when we have it on file. */
  shop: { house: string; url: string } | null;
};

function extraTags(extra: SetlistExtra): ShowTag[] {
  const tags: ShowTag[] = trackGenres(extra.artist).map(value => ({ kind: 'music', value, basis: 'ours' }));
  const season = seasonTag(extra.season);
  if (season) tags.push({ kind: 'season', value: season, basis: 'show' });
  const brand = BRANDS.find(b => norm(b) === norm(extra.house));
  if (brand) tags.push({ kind: 'brand', value: brand, basis: 'show' });
  return tags;
}
const extraTrack = (extra: SetlistExtra): InspiredTrack => ({
  title: extra.title, artist: extra.artist, spotifyId: extra.spotifyId, genres: trackGenres(extra.artist), showId: extra.id, show: showLabel(extra),
});
const extraDesigner = (extra: SetlistExtra): Designer => ({ ...extra.designer, photo: null });

const MIN_PLAYLIST = 2;

/**
 * The shows, designers and playlists for the reader's tags. A show counts when it shares at least one tag; more shared
 * tags rank it higher. Playlists stack: the reader's whole runway mix first, then one per music genre, then one per other
 * tag, each only when it has at least two songs.
 */
export function inspire(selected: Tag[], notes: readonly RunwayNote[], songs: readonly RunwaySong[] = [], extras: readonly SetlistExtra[] = SETLIST_EXTRAS): Inspiration {
  const wanted = new Set(selected.map(tagKey));
  const shows = notes.flatMap((note, order): (InspiredShow & { order: number })[] => {
    const sources = showSources(note);
    if (!sources.length) return [];
    const tags = showTags(note);
    const matched = tags.filter(tag => wanted.has(tagKey(tag))).map(({ kind, value }) => ({ kind, value }));
    if (!matched.length) return [];
    const label = showLabel(note);
    const tracks = (note.music?.tracks ?? []).filter(named).map(track => ({
      title: track.title, artist: track.artist, spotifyId: track.spotifyId, genres: trackGenres(track.artist), showId: note.id, show: label,
    }));
    return [{ note, label, designers: designersFor(note, songs), tags, matched, sources, tracks, order }];
  }).sort((a, b) => b.matched.length - a.matched.length || a.order - b.order).map(({ order: _order, ...show }) => show);

  // Extras that share a tag join the shows: as setlist rows, designers and playlist tracks, after the written-up shows.
  const extraShows = extras.flatMap(extra => {
    const matched = extraTags(extra).filter(tag => wanted.has(tagKey(tag))).map(({ kind, value }) => ({ kind, value }));
    return matched.length ? [{ extra, matched, label: showLabel(extra), designer: extraDesigner(extra), track: extraTrack(extra) }] : [];
  });

  const designers = new Map<string, InspiredDesigner>();
  const addDesigner = (designer: Designer, label: string, matchedHere: Tag[]) => {
    const seen = designers.get(norm(designer.name));
    const matched = [...(seen?.matched ?? []), ...matchedHere].filter((t, i, all) => all.findIndex(o => tagKey(o) === tagKey(t)) === i);
    designers.set(norm(designer.name), { designer: seen?.designer.photo ? seen.designer : designer, shows: [...(seen?.shows ?? []), label], matched });
  };
  for (const show of shows) for (const designer of show.designers) addDesigner(designer, show.label, show.matched);
  for (const e of extraShows) addDesigner(e.designer, e.label, e.matched);

  // The setlist: per designer and show, the song that best fits the reader's genres, else the show's first named song.
  const genres = selected.filter(t => t.kind === 'music').map(t => t.value);
  const setlist: SetlistRow[] = [
    ...shows.flatMap(show => {
      const track = show.tracks.find(t => t.genres.some(g => genres.includes(g))) ?? show.tracks[0];
      if (!track) return [];
      const placed = show.note.music?.tracks.find(t => t.title === track.title && t.artist === track.artist);
      return show.designers.map(designer => ({ id: `${show.note.id}:${norm(designer.name)}`, designer, show: show.label, title: track.title, artist: track.artist, spotifyId: track.spotifyId, part: placed?.part ?? null, sources: show.sources, matched: show.matched, shop: houseShop(show.note.house) }));
    }),
    ...extraShows.map(e => ({ id: e.extra.id, designer: e.designer, show: e.label, title: e.extra.title, artist: e.extra.artist, spotifyId: e.extra.spotifyId, part: e.extra.part, sources: e.extra.sources, matched: e.matched, shop: houseShop(e.extra.house) })),
  ].sort((a, b) => b.matched.length - a.matched.length); // more shared tags first; ties keep show order

  const unique = (tracks: InspiredTrack[]) => tracks.filter((t, i, all) => all.findIndex(o => norm(o.title) === norm(t.title) && norm(o.artist) === norm(t.artist)) === i);
  const mix = unique([...shows.flatMap(show => show.tracks), ...extraShows.map(e => e.track)]);
  const playlists: InspiredPlaylist[] = [];
  if (mix.length >= MIN_PLAYLIST) playlists.push({ id: 'mix', title: 'Your runway mix', basis: null, tracks: mix });
  for (const tag of selected) {
    const sharesTag = (matched: Tag[]) => tag.kind === 'music' || matched.some(m => tagKey(m) === tagKey(tag));
    const fits = (track: InspiredTrack) => tag.kind !== 'music' || track.genres.includes(tag.value);
    const tracks = unique([
      ...shows.filter(show => sharesTag(show.matched)).flatMap(show => show.tracks.filter(fits)),
      ...extraShows.filter(e => sharesTag(e.matched) && fits(e.track)).map(e => e.track),
    ]);
    if (tracks.length < MIN_PLAYLIST) continue;
    const title = tag.kind === 'music' ? `${tag.value} from the runway` : tag.kind === 'brand' ? `${tag.value} on the runway` : `${tag.value} runways`;
    playlists.push({ id: tagKey(tag), title, basis: tag, tracks });
  }
  return { shows, designers: [...designers.values()], setlist, playlists };
}

/** The tag the reader tapped last, kept on their device so the room still leads with it after a reload. */
export const LEAD_TAG_KEY = 'ml-lead-tag-v1';
export function readLeadTag(): Tag | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(LEAD_TAG_KEY) ?? 'null') as Partial<Tag> | null;
    return raw && TAG_KINDS.includes(raw.kind as TagKind) && typeof raw.value === 'string' ? { kind: raw.kind as TagKind, value: raw.value } : null;
  } catch { return null; }
}
export function writeLeadTag(tag: Tag | null) {
  try { if (tag) window.localStorage.setItem(LEAD_TAG_KEY, JSON.stringify(tag)); else window.localStorage.removeItem(LEAD_TAG_KEY); } catch { /* storage unavailable */ }
}

/** A profile with one tag switched on or off; tags live in the quiz's own fields, so the quiz and the cloud agree. */
export function withTag<P extends Pick<StyleProfile, TagKind>>(profile: P, tag: Tag, on: boolean): P {
  const now = profile[tag.kind];
  return { ...profile, [tag.kind]: on ? (now.includes(tag.value) ? now : [...now, tag.value]) : now.filter(v => v !== tag.value) };
}

/**
 * The runway to feature for the reader: among sourced shows sharing their tags, the best match for the tag they tapped
 * last, else the best match overall. Null when nothing matches, so the room keeps its usual pick.
 */
export function featuredShow(selected: Tag[], notes: readonly RunwayNote[], lead: Tag | null = null): InspiredShow | null {
  const { shows } = inspire(selected, notes);
  const leading = lead && selected.some(t => tagKey(t) === tagKey(lead)) ? shows.find(show => show.matched.some(m => tagKey(m) === tagKey(lead))) : undefined;
  return leading ?? shows[0] ?? null;
}

/** One song on a featured playlist page: where it walked, who showed, what's cited, and the house's store. */
export type PlaylistRow = { track: InspiredTrack; designers: Designer[]; part: string | null; sources: NoteSource[]; shop: { house: string; url: string } | null };
export type PlaylistPage = { playlist: InspiredPlaylist; rows: PlaylistRow[]; shows: number; designers: Designer[] };

/** The full page for one suggested playlist: each song traced back to its show and its sources. Null if it's gone. */
export function playlistPage(inspiration: Inspiration, id: string): PlaylistPage | null {
  const playlist = inspiration.playlists.find(p => p.id === id);
  if (!playlist) return null;
  const rows = playlist.tracks.map((track): PlaylistRow => {
    const show = inspiration.shows.find(s => s.note.id === track.showId);
    if (show) {
      const placed = show.note.music?.tracks.find(t => t.title === track.title && t.artist === track.artist);
      return { track, designers: show.designers, part: placed?.part ?? null, sources: show.sources, shop: houseShop(show.note.house) };
    }
    const extra = inspiration.setlist.find(r => r.id === track.showId);
    return { track, designers: extra ? [extra.designer] : [], part: extra?.part ?? null, sources: extra?.sources ?? [], shop: extra?.shop ?? null };
  });
  const designers = rows.flatMap(r => r.designers).filter((d, i, all) => all.findIndex(o => norm(o.name) === norm(d.name)) === i);
  return { playlist, rows, shows: new Set(playlist.tracks.map(t => t.showId)).size, designers };
}
