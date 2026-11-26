// Runway inspiration: after the style quiz, the runway shows that fit the reader's tags, the designers behind them,
// and stacked playlists built only from those shows' soundtracks. Pure and browser-safe, so the matching is tested.
//
// Tag method. Every show carries tags in the quiz's own vocabulary (style-profile.ts), of two kinds:
// - "show" tags read straight off the show: its season and, when the quiz names it, its house.
// - "our read" tags are Melody Lust's interpretation: a track's music genre and a show's aesthetic. They are labelled as
//   ours on the page, apart from the sources, which are the reviews and articles that place each song at each show.
// A show with no source on file is left out: everything shown here roots back to a cited soundtrack.

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
export type Inspiration = { shows: InspiredShow[]; designers: InspiredDesigner[]; playlists: InspiredPlaylist[] };

export const showLabel = (note: Pick<RunwayNote, 'house' | 'season' | 'year'>) => `${note.house} ${note.season} ${note.year}`;
const named = (track: NoteTrack): track is NoteTrack & { title: string } => Boolean(track.title);

/** Designers for a show: the room's songs carry portraits; a show only in the notes names them without one. */
function designersFor(note: RunwayNote, songs: readonly RunwaySong[]): Designer[] {
  const fromSongs = songs.filter(song => noteId(song) === note.id).flatMap(song => song.designers);
  const byName = new Map(fromSongs.map(d => [norm(d.name), d]));
  const names = note.designers.length ? note.designers : [note.house];
  return names.map(name => byName.get(norm(name)) ?? { name, wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`, photo: null });
}

const MIN_PLAYLIST = 2;

/**
 * The shows, designers and playlists for the reader's tags. A show counts when it shares at least one tag; more shared
 * tags rank it higher. Playlists stack: the reader's whole runway mix first, then one per music genre, then one per other
 * tag, each only when it has at least two songs.
 */
export function inspire(selected: Tag[], notes: readonly RunwayNote[], songs: readonly RunwaySong[] = []): Inspiration {
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

  const designers = new Map<string, InspiredDesigner>();
  for (const show of shows) for (const designer of show.designers) {
    const seen = designers.get(norm(designer.name));
    const matched = [...(seen?.matched ?? []), ...show.matched].filter((t, i, all) => all.findIndex(o => tagKey(o) === tagKey(t)) === i);
    designers.set(norm(designer.name), { designer: seen?.designer.photo ? seen.designer : designer, shows: [...(seen?.shows ?? []), show.label], matched });
  }

  const unique = (tracks: InspiredTrack[]) => tracks.filter((t, i, all) => all.findIndex(o => norm(o.title) === norm(t.title) && norm(o.artist) === norm(t.artist)) === i);
  const mix = unique(shows.flatMap(show => show.tracks));
  const playlists: InspiredPlaylist[] = [];
  if (mix.length >= MIN_PLAYLIST) playlists.push({ id: 'mix', title: 'Your runway mix', basis: null, tracks: mix });
  for (const tag of selected) {
    const tracks = unique(shows.filter(show => tag.kind === 'music' || show.matched.some(m => tagKey(m) === tagKey(tag)))
      .flatMap(show => show.tracks.filter(track => tag.kind !== 'music' || track.genres.includes(tag.value))));
    if (tracks.length < MIN_PLAYLIST) continue;
    const title = tag.kind === 'music' ? `${tag.value} from the runway` : tag.kind === 'brand' ? `${tag.value} on the runway` : `${tag.value} runways`;
    playlists.push({ id: tagKey(tag), title, basis: tag, tracks });
  }
  return { shows, designers: [...designers.values()], playlists };
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
