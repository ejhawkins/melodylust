// Runway Songs: the sampler's sourced tracks as a player queue, with each show's season, year and
// designer for the player's headline rows. Pure and browser-safe so the queue moves are unit-tested.

import { SAMPLER_TRACKS, type CategoryId, type SamplerRow } from './runway-sampler';

export type Designer = {
  name: string;
  wikipedia: string;
  /**
   * The Wikipedia lead photo (or the Wikidata one where the article has none), credited as its licence asks. Null when
   * Commons has no portrait. An archive photo of your own may have no credit.
   */
  photo: { src: string; credit: string | null; licence: string | null; source: string | null } | null;
};

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const DESIGNERS = {
  anderson: {
    name: 'Jonathan Anderson', wikipedia: 'https://en.wikipedia.org/wiki/Jonathan_Anderson_(fashion_designer)',
    photo: { src: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Jonathan_Anderson_in_2014.jpg', credit: 'Marie Claire Korea', licence: 'CC BY 3.0', source: commons('Jonathan_Anderson_in_2014.jpg') },
  },
  prada: {
    name: 'Miuccia Prada', wikipedia: 'https://en.wikipedia.org/wiki/Miuccia_Prada',
    photo: { src: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Miuccia_Prada_%28cropped%29.jpg', credit: 'Cory M. Grenier', licence: 'CC BY-SA 2.0', source: commons('Miuccia_Prada_(cropped).jpg') },
  },
  // Wikidata's image for him (Backstageraf.jpg) is models backstage at his AW07 show, not him.
  simons: { name: 'Raf Simons', wikipedia: 'https://en.wikipedia.org/wiki/Raf_Simons', photo: null },
  demna: {
    name: 'Demna', wikipedia: 'https://en.wikipedia.org/wiki/Demna',
    photo: {
      src: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Georgian_fashion_designer_Demna_Gvasalia_speaking_with_Ukrainian_President_Volodymyr_Zelenskyy_%28cropped%29.jpg',
      credit: 'Presidential Administration of Ukraine', licence: 'CC BY 4.0',
      source: commons('Georgian_fashion_designer_Demna_Gvasalia_speaking_with_Ukrainian_President_Volodymyr_Zelenskyy_(cropped).jpg'),
    },
  },
  slimane: {
    name: 'Hedi Slimane', wikipedia: 'https://en.wikipedia.org/wiki/Hedi_Slimane',
    photo: { src: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Hedi_Slimane_in_2015.jpg', credit: 'Yann Rzepka', licence: 'CC BY-SA 4.0', source: commons('Hedi_Slimane_in_2015.jpg') },
  },
} satisfies Record<string, Designer>;

type DesignerId = keyof typeof DESIGNERS;

/** Season, year and creative director(s) of the show each sourced track played at, read from the sampler's show notes. */
export const SHOWS: Record<string, { season: string; year: number; designers: DesignerId[] }> = {
  'spem-in-alium': { season: 'Spring/Summer', year: 2021, designers: ['anderson'] },
  'sin-thetik': { season: 'Spring/Summer', year: 2021, designers: ['prada', 'simons'] },
  'narkosis-spektre': { season: 'Fall/Winter', year: 2021, designers: ['prada', 'simons'] },
  'gimme-more-bfrnd': { season: 'Summer', year: 2025, designers: ['demna'] },
  runway: { season: 'Spring/Summer', year: 2019, designers: ['slimane'] },
  'work-bitch': { season: 'Spring/Summer', year: 2014, designers: ['prada'] },
  'the-one-i-love': { season: 'Resort', year: 2019, designers: ['prada'] },
  'losing-my-edge': { season: 'Summer', year: 2024, designers: ['slimane'] },
  'hello-operator': { season: 'Winter', year: 2023, designers: ['slimane'] },
  'mad-world': { season: 'Resort', year: 2019, designers: ['prada'] },
  'wake-up': { season: 'Resort', year: 2019, designers: ['prada'] },
  'love-in-e-minor': { season: 'Autumn/Winter', year: 2022, designers: ['demna'] },
};

/** Pill labels: the one word that tells the four catwalk energies apart. */
export const CATEGORY_LABELS: Record<CategoryId, string> = { A: 'Industrial', B: 'Electro-pulse', C: 'Post-punk', D: 'Spatial' };

export type RunwaySong = {
  id: string;
  name: string;
  /** The parenthetical in a release title, e.g. "BFRND Remix". */
  version: string | null;
  artist: string;
  house: string;
  season: string;
  year: number;
  designers: Designer[];
  category: CategoryId;
  spotifyUri: string;
  spotifyUrl: string;
  /** The show's first looks on Tagwalk, in runway order; linked, never their photos. */
  looks: string[];
};

/** "Sin Thetik (Prada SS21 Womenswear Version)" → name "Sin Thetik", version "Prada SS21 Womenswear Version". */
export function splitTitle(title: string) {
  const [, name, version] = /^(.+?)\s*\(([^()]+)\)$/.exec(title.trim()) ?? [];
  return name && version ? { name, version } : { name: title.trim(), version: null };
}

/** The reader's running order as playable songs: sourced and not hidden. Manual picks have no Spotify track to load. */
export function runwaySongs(rows: SamplerRow[]): RunwaySong[] {
  return rows.flatMap(row => {
    const track = SAMPLER_TRACKS.find(sourced => sourced.id === row.id);
    const show = SHOWS[row.id];
    if (row.hidden || row.origin !== 'sourced' || !track || !show || !row.house) return [];
    const { name, version } = splitTitle(row.title);
    return [{
      id: row.id, name, version, artist: row.artist, house: row.house, season: show.season, year: show.year,
      designers: show.designers.map(id => DESIGNERS[id]), category: row.category,
      spotifyUri: `spotify:track:${track.spotifyId}`, spotifyUrl: row.spotifyUrl, looks: [],
    }];
  });
}

/** Headline sizes in px at desktop width, largest first. The player's type classes follow this order. */
export const TITLE_STEPS = [84, 68, 56, 46] as const;
const COLUMN_PX = 360; // the desktop now-playing column inside its padding, at its narrowest (1280px window)
const TRACKING_EM = -0.02;

// Advance widths in em of Archivo ExtraBold at 125% width, measured in the browser. Anything else counts as wide.
const GLYPH_EM: Record<string, number> = {
  A: 0.933, B: 0.914, C: 0.942, D: 0.933, E: 0.863, F: 0.799, G: 1.012, H: 0.989, I: 0.373, J: 0.734, K: 0.951, L: 0.754, M: 1.148,
  N: 0.988, O: 1.013, P: 0.861, Q: 1.013, R: 0.933, S: 0.867, T: 0.848, U: 0.968, V: 0.904, W: 1.213, X: 0.94, Y: 0.918, Z: 0.857,
  0: 0.786, 1: 0.703, 2: 0.783, 3: 0.789, 4: 0.781, 5: 0.789, 6: 0.791, 7: 0.717, 8: 0.803, 9: 0.791,
  ' ': 0.304, '/': 0.308, '&': 1.001, '\'': 0.278, '’': 0.305, '.': 0.349, ',': 0.349, '-': 0.416, '!': 0.358, '?': 0.715, ':': 0.344,
};

/** Set width of uppercase text in em, tracking included. */
export const textWidthEm = (text: string) =>
  [...text.toUpperCase()].reduce((width, glyph) => width + (GLYPH_EM[glyph] ?? 1) + TRACKING_EM, 0);

function lineCount(words: string[], maxEm: number) {
  const space = textWidthEm(' ');
  let lines = 0;
  let used = 0;
  for (const word of words) {
    const width = textWidthEm(word);
    if (width > maxEm) return Infinity;
    if (lines && used + space + width <= maxEm) used += space + width;
    else { lines += 1; used = width; }
  }
  return lines;
}

/** The largest step at which the title sets in two lines or fewer without breaking a word. */
export function titleStep(title: string): number {
  const words = title.split(/\s+/).filter(Boolean);
  const step = TITLE_STEPS.findIndex(size => lineCount(words, COLUMN_PX / size) <= 2);
  return step === -1 ? TITLE_STEPS.length - 1 : step;
}

/** Shuffle picks any other song; otherwise the queue wraps. */
export function nextIndex(current: number, count: number, shuffle: boolean, random = Math.random) {
  if (count < 2) return 0;
  if (!shuffle) return (current + 1) % count;
  const pick = Math.floor(random() * (count - 1));
  return pick >= current ? pick + 1 : pick;
}

export const previousIndex = (current: number, count: number) => (count < 2 ? 0 : (current - 1 + count) % count);

/** Previous restarts the song once it's this far in, like most players. */
export const RESTART_AFTER_MS = 3000;

export const clock = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
