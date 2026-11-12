// Runway Notes: each show's songs gathered into one note with up to three sections, always in this order:
// Report, Music Notes, Style Notes. Pure and browser-safe, so the grouping and the "only what has content" rules
// are unit-tested.
//
// The songs come from Runway Songs. Everything else (venue, quote, showstopper, the "why it fits" lines, the style
// suggestions) is editorial, entered per show in RUNWAY_NOTE_EDITORIAL with the pages it was read from. A field
// nobody has reported stays empty, and its line (or its whole section) is left out: nothing here is guessed.

import type { CategoryId } from './runway-sampler';
import { splitTitle, type Designer, type RunwaySong } from './runway-songs';
import { showKey, type ShowNotes } from './show-notes';

export type NoteSection = 'report' | 'music' | 'style';
/** The order the sections keep, whichever of them a note has. */
export const NOTE_SECTIONS: readonly NoteSection[] = ['report', 'music', 'style'];
export const SECTION_TITLES: Record<NoteSection, string> = { report: 'Report', music: 'Music Notes', style: 'Style Notes' };
export const SECTION_TAGS: Record<NoteSection, string> = { report: 'Report', music: 'Music', style: 'Style' };

/** How a source was checked, as the sampler records it: "read" = the page was read, "excerpt" = seen in search results only. */
export type NoteSource = { title: string; url: string; checked: 'read' | 'excerpt' };
export type StyleNote = { text: string; link?: { label: string; href: string } };
export type NoteQuote = { text: string; by: string; source: NoteSource };

/** One piece of the show's music in running order. `title` is null when reviews name the artist but not the piece. */
export type EditorialTrack = {
  title: string | null;
  artist: string;
  /** Where it fell in the show, e.g. "First movement". */
  part?: string;
  spotifyId?: string;
  why?: string;
  /** The nearest of the four catwalk energies, needed only so the track can join the room's queue. */
  category?: CategoryId;
};

export type NoteEditorial = {
  house: string;
  season: string;
  year: number;
  /** For a show with no song in Runway Songs yet; a show that has one takes its designers from there. */
  designers?: Pick<Designer, 'name' | 'wikipedia'>[];
  /** A sketched avatar. There are none yet, so cards show the designer's initial. */
  avatar?: { src: string; alt: string };
  venue?: string;
  city?: string;
  muse?: string;
  /** Shown in the muse's place when the show has no muse. */
  quote?: NoteQuote;
  showstopper?: string;
  /** Two or three sentences. */
  summary?: string;
  /** The card's one line: why the sound fits the clothes. */
  why?: string;
  /** The DJ or music producer, when known. */
  musicCredit?: string;
  /** The show's music in running order, when some of it isn't in Runway Songs. */
  tracks?: EditorialTrack[];
  /** "Why it fits" lines for tracks that are in Runway Songs, by song id. */
  whyBySong?: Record<string, string>;
  /** Three to five ways to wear it. */
  style?: StyleNote[];
  sources?: NoteSource[];
};

const W_MAGAZINE: NoteSource = { title: 'W Magazine: There Was Not a Single Dress at Thom Browne Fall 2017', url: 'https://www.wmagazine.com/story/there-was-not-a-single-dress-at-thom-browne-fall-2017', checked: 'read' };

/**
 * The editorial side of each note. Thom Browne Fall/Winter 2017 is the first: the womenswear show in the room's hero film.
 * Every fact is from the reviews listed under `sources`; the "why" lines and the style suggestions are ours. No review
 * names a muse or who mixed the music, so those are left out, and the two pieces the reviews leave unnamed have no player.
 */
export const RUNWAY_NOTE_EDITORIAL: readonly NoteEditorial[] = [
  {
    house: 'Thom Browne', season: 'Fall/Winter', year: 2017,
    designers: [{ name: 'Thom Browne', wikipedia: 'https://en.wikipedia.org/wiki/Thom_Browne' }],
    venue: 'Skylight Modern', city: 'New York',
    quote: { text: 'Tailoring can be as feminine and as sexy as a dress.', by: 'Thom Browne', source: W_MAGAZINE },
    showstopper: 'The finale bride, in a down overcoat with a fur “No Dresses” button, circled the rink while an attendant carried her quilted down train.',
    summary: 'Thom Browne turned Skylight Modern into a frozen pond, with penguins on the ice and a plush stand-in for his dog Hector in a rowboat. Models crossed it in skate-shaped shoes for more than fifty looks without a single dress. The collection was a study in tailoring, pieced like Amish quilts and patchwork.',
    why: 'Wagner, Kraftwerk, then Marilyn Manson: three acts of sound for a show built as one total work of art.',
    tracks: [
      { title: null, artist: 'Wagner', part: 'First movement', why: 'A total-art opening: the collection was built on Gesamtkunstwerk, the idea of one complete work of art.' },
      { title: null, artist: 'Kraftwerk', part: 'Second movement', why: 'A machine-clean pulse for the middle act, as exact as the tailoring.' },
      { title: 'The Dope Show', artist: 'Marilyn Manson', part: 'Third movement', spotifyId: '1wrIp2G2kEa2pt6jsUJ05A', category: 'C', why: 'Glam menace for the last act; Browne told W that Manson lives his life as a piece of art.' },
    ],
    style: [
      { text: 'Swap the dress for a suit: a grey flannel jacket and matching trousers, cut close.' },
      { text: 'Wear one quilted or down layer over the tailoring, the way the finale wore a puffer as an overcoat.' },
      { text: 'Pick one pattern, houndstooth or argyle, and repeat it from coat to hem.' },
      { text: 'Keep to grey, ivory and black, and let the textures do the work.' },
      { text: 'Finish with one playful piece, like the show’s penguin bags.' },
    ],
    sources: [
      W_MAGAZINE,
      { title: 'Wallpaper*: Thom Browne A/W 2017', url: 'https://www.wallpaper.com/fashion/fashionweeks/womenswear-aw-2017/new-york/thom-browne-aw-2017-images', checked: 'read' },
      { title: '10 Magazine: Thom Browne, Ready-to-wear AW17', url: 'https://10magazine.com/thom-browne-ready-to-wear-aw17/', checked: 'read' },
      { title: 'The Business of Fashion: Thom Browne Autumn/Winter 2017', url: 'https://www.businessoffashion.com/reviews/fashion-week/thom-browne-autumnwinter-2017/', checked: 'excerpt' },
    ],
  },
];

export type NoteTrack = {
  title: string | null;
  artist: string;
  part: string | null;
  spotifyId: string | null;
  why: string | null;
  /** The Runway Songs id this track plays under in the room's queue, when it is in it. */
  songId: string | null;
};

export type RunwayNote = {
  id: string;
  house: string;
  designers: string[];
  season: string;
  year: number;
  avatar: { src: string; alt: string } | null;
  /** The designer's initial (the house's when no designer is named), shown where there is no sketched avatar. */
  initial: string;
  why: string | null;
  report: {
    place: string | null;
    /** The muse, or the designer's quote in that slot when there is no muse. */
    voice: { kind: 'muse'; text: string } | ({ kind: 'quote' } & NoteQuote) | null;
    showstopper: string | null;
    /** Paragraphs of three sentences or fewer. */
    summary: string[];
    /** True when the summary is the AI show notes (Gemini), which the page says so. */
    summaryByAi: boolean;
  } | null;
  music: { credit: string | null; tracks: NoteTrack[] } | null;
  style: StyleNote[] | null;
  /** The sections this note has, in NOTE_SECTIONS order. */
  sections: NoteSection[];
  /** The track the card names and plays: the first one in the room's queue, else the first with a player, else the first. */
  lead: NoteTrack | null;
  sources: NoteSource[];
};

const slug = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const noteId = (show: { house: string; season: string; year: number }) => `${slug(show.house)}-${slug(show.season)}-${show.year}`;
const spotifyIdOf = (uri: string) => /([A-Za-z0-9]{22})$/.exec(uri)?.[1] ?? null;
const clean = (value: string | null | undefined) => value?.trim() || null;

/** Text as paragraphs of three sentences or fewer, so a long summary never sets as one block. */
export function paragraphs(text: string, perParagraph = 3): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+(?:[.!?]+["”’)]*|$)/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];
  const groups: string[] = [];
  for (let start = 0; start < sentences.length; start += perParagraph) groups.push(sentences.slice(start, start + perParagraph).join(' '));
  return groups;
}

/**
 * Editorial tracks that have a Spotify track but aren't in Runway Songs, as songs for the room's queue, so a show the
 * sampler and the archive don't hold still plays through the room's player. They go after the songs given.
 */
export function editorialSongs(existing: readonly RunwaySong[], editorial: readonly NoteEditorial[] = RUNWAY_NOTE_EDITORIAL): RunwaySong[] {
  const held = new Set(existing.map(song => spotifyIdOf(song.spotifyUri)));
  return editorial.flatMap(show => (show.tracks ?? []).flatMap(track => {
    if (!track.title || !track.spotifyId || !track.category || held.has(track.spotifyId)) return [];
    const { name, version } = splitTitle(track.title);
    return [{
      id: `${noteId(show)}-${slug(track.title)}`, name, version, artist: track.artist, house: show.house, season: show.season, year: show.year,
      designers: (show.designers ?? []).map(designer => ({ ...designer, photo: null })), category: track.category,
      spotifyUri: `spotify:track:${track.spotifyId}`, spotifyUrl: `https://open.spotify.com/track/${track.spotifyId}`, looks: [],
    }];
  }));
}

/**
 * The room's runway songs as notes, one per show. Shows with editorial come first, in the order they were written; the rest
 * follow in song order. A show's AI notes (when it has them and no editor's summary) supply the Report's summary.
 */
export function runwayNotes(songs: readonly RunwaySong[], showNotes: Record<string, ShowNotes> = {}, editorial: readonly NoteEditorial[] = RUNWAY_NOTE_EDITORIAL): RunwayNote[] {
  const groups = new Map<string, RunwaySong[]>();
  for (const song of songs) {
    const id = noteId(song);
    groups.set(id, [...(groups.get(id) ?? []), song]);
  }
  const written = new Map(editorial.map(show => [noteId(show), show]));

  const build = (id: string): RunwayNote | null => {
    const show = written.get(id);
    const group = groups.get(id) ?? [];
    const first = group[0];
    const base = show ?? first;
    if (!base) return null;

    const fromSong = (song: RunwaySong): NoteTrack => ({
      title: song.version ? `${song.name} (${song.version})` : song.name, artist: song.artist, part: null,
      spotifyId: spotifyIdOf(song.spotifyUri), why: clean(show?.whyBySong?.[song.id]), songId: song.id,
    });
    // The editor's running order first, each track tied to its song in the queue; then any of the show's songs it leaves out.
    const listed = (show?.tracks ?? []).map((track): NoteTrack => {
      const song = group.find(candidate => (track.spotifyId && spotifyIdOf(candidate.spotifyUri) === track.spotifyId) || (track.title && candidate.name === splitTitle(track.title).name && candidate.artist === track.artist));
      return { title: clean(track.title), artist: track.artist, part: clean(track.part), spotifyId: track.spotifyId ?? (song ? spotifyIdOf(song.spotifyUri) : null), why: clean(track.why) ?? clean(song && show?.whyBySong?.[song.id]), songId: song?.id ?? null };
    });
    const tracks = [...listed, ...group.filter(song => !listed.some(track => track.songId === song.id)).map(fromSong)];

    const ai = showNotes[showKey(base)];
    const editorSummary = clean(show?.summary);
    const summary = editorSummary ?? (ai ? [ai.summary, ai.atmosphere].filter(Boolean).join(' ') : null);
    const place = [clean(show?.venue), clean(show?.city)].filter(Boolean).join(', ') || null;
    const muse = clean(show?.muse);
    const voice: NonNullable<RunwayNote['report']>['voice'] = muse ? { kind: 'muse', text: muse } : show?.quote ? { kind: 'quote', ...show.quote } : null;
    const showstopper = clean(show?.showstopper);
    const report = place || voice || showstopper || summary
      ? { place, voice, showstopper, summary: summary ? paragraphs(summary) : [], summaryByAi: !editorSummary && Boolean(summary) }
      : null;
    const music = tracks.length ? { credit: clean(show?.musicCredit), tracks } : null;
    const style = show?.style?.filter(note => note.text.trim()).slice(0, 5) ?? [];
    const has: Record<NoteSection, boolean> = { report: Boolean(report), music: Boolean(music), style: style.length > 0 };

    const designers = (first?.designers.length ? first.designers : show?.designers ?? []).map(designer => designer.name);
    const sources = [...(show?.sources ?? []), ...(report?.summaryByAi && ai ? ai.sources.map((source): NoteSource => ({ title: source.title ?? source.url, url: source.url, checked: 'read' })) : [])];
    return {
      id, house: base.house, designers, season: base.season, year: base.year, avatar: show?.avatar ?? null,
      initial: (designers[0] ?? base.house).trim().charAt(0).toUpperCase(),
      why: clean(show?.why), report, music, style: has.style ? style : null,
      sections: NOTE_SECTIONS.filter(section => has[section]),
      lead: tracks.find(track => track.songId) ?? tracks.find(track => track.spotifyId) ?? tracks[0] ?? null,
      sources: sources.filter((source, index, all) => all.findIndex(other => other.url === source.url) === index),
    };
  };

  const ids = [...written.keys(), ...[...groups.keys()].filter(id => !written.has(id))];
  return ids.flatMap(id => build(id) ?? []);
}
