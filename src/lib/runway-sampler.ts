// Runway Sound Sampler: sourced show soundtracks sorted by catwalk energy, plus the reader's own
// manual edits. Pure and browser-safe so the merge and the band checks are unit-tested.
// Every sourced track names the article that ties it to the show; tempos are FreqBlog analysis
// of the streaming preview, cross-checked where noted. Category placements are editorial.

import { z } from 'zod';

export const SAMPLER_PLAYLIST = {
  title: 'Runway Sound Sampler: Balenciaga, Prada, Celine, Loewe',
  url: 'https://open.spotify.com/playlist/1lcqw2N8tBqiXRbEQ6iAlg',
  embedUrl: 'https://open.spotify.com/embed/playlist/1lcqw2N8tBqiXRbEQ6iAlg?utm_source=generator&theme=0',
  researched: '2026-10-31',
} as const;

export const categoryIds = ['A', 'B', 'C', 'D'] as const;
export type CategoryId = (typeof categoryIds)[number];

/** The four catwalk energies. D has no tempo band: it's ambient and downtempo. */
export const RUNWAY_CATEGORIES: Record<CategoryId, { name: string; band: { min: number; max: number } | null; sound: string }> = {
  A: { name: 'Dystopian / Industrial', band: { min: 128, max: 140 }, sound: 'Harsh syncopation, deconstructed club, sub-bass, mechanical noise' },
  B: { name: 'High-Glamour / Electro-Pulse', band: { min: 120, max: 126 }, sound: 'Four-on-the-floor, polished disco edits, electroclash, ready-to-wear strut' },
  C: { name: 'Garage Rock / Post-Punk / Coldwave', band: { min: 115, max: 130 }, sound: 'Overdriven bass, raw live drums, analog synths, indie sleaze' },
  D: { name: 'Avant-Garde / Spatial Minimal', band: null, sound: 'Negative space, neo-classical drones, micro-samples, couture atmosphere' },
};

export type SamplerSource = { id: string; title: string; url: string; checked: 'read' | 'excerpt' };

/** How each source was checked: "read" = the page was read, "excerpt" = seen in search results only. */
export const SAMPLER_SOURCES: SamplerSource[] = [
  { id: 'SRC-001', title: 'Culted: runway soundtracks we’re still listening to', url: 'https://culted.com/the-runway-soundtracks-were-still-listening-to-from-mcqueen-to-balenciaga/', checked: 'read' },
  { id: 'SRC-002', title: 'The Impression: Balenciaga launches Britney Spears collaboration', url: 'https://theimpression.com/balenciaga-launches-britney-spears-collaboration/', checked: 'excerpt' },
  { id: 'SRC-003', title: 'i-D: BFRND interview', url: 'https://i-d.co/?p=11557', checked: 'read' },
  { id: 'SRC-004', title: 'DJ Mag: Plastikman music for Prada', url: 'https://djmag.com/news/richie-hawtin-debuts-new-plastikman-music-prada-fashion-show', checked: 'excerpt' },
  { id: 'SRC-005', title: 'Document (9 May 2018): Frédéric Sanchez on Prada Resort 2019', url: 'https://fredericsanchez.com/fredericsanchez/?p=445302', checked: 'read' },
  { id: 'SRC-006', title: 'AnOther: Frédéric Sanchez, show music maestro', url: 'https://www.anothermag.com/fashion-beauty/3632/frederic-sanchez-show-music-maestro', checked: 'excerpt' },
  { id: 'SRC-007', title: 'Psychedelic Baby: La Femme “Runway” premiere', url: 'https://www.psychedelicbabymag.com/?p=733', checked: 'excerpt' },
  { id: 'SRC-008', title: 'Rolling Stone: Celine at The Wiltern', url: 'https://www.rollingstone.com/product-recommendations/lifestyle/celine-fashion-show-wiltern-los-angeles-iggy-pop-strokes-1234644788/', checked: 'excerpt' },
  { id: 'SRC-009', title: 'Wallpaper: Celine Homme “show that never was”', url: 'https://wallpaper.com/fashion-beauty/hedi-slimane-celine-homme-ss-2024', checked: 'excerpt' },
  { id: 'SRC-010', title: 'Harper’s Bazaar Singapore: Loewe Spring Summer 2021', url: 'https://www.harpersbazaar.com.sg/fashion/watch-the-loewe-spring-summer-2021-collection-here', checked: 'excerpt' },
];

export type SamplerTrack = {
  id: string;
  title: string;
  artist: string;
  /** null = free time (no steady pulse to count). */
  bpm: number | null;
  bpmNote?: string;
  category: CategoryId;
  house: string;
  show: string;
  sourceIds: string[];
  spotifyId: string;
  /** Where the streaming version differs from what played at the show. */
  versionNote?: string;
};

/** Playlist order: spatial open, industrial, glamour pulse, post-punk, minimal close. */
export const SAMPLER_TRACKS: SamplerTrack[] = [
  { id: 'spem-in-alium', title: 'Spem in alium', artist: 'Thomas Tallis · The Tallis Scholars', bpm: null, category: 'D', house: 'Loewe', show: 'SS21 show-on-the-wall', sourceIds: ['SRC-010'], spotifyId: '4XAvUh7v5cy7I5YIewJCCR', versionNote: 'The recording used at the show is TK; The Tallis Scholars recording stands in.' },
  { id: 'sin-thetik', title: 'Sin Thetik (Prada SS21 Womenswear Version)', artist: 'Plastikman', bpm: 64, bpmNote: 'Read from the quiet intro at low confidence; may count as 128 double-time.', category: 'A', house: 'Prada', show: 'SS21 womenswear', sourceIds: ['SRC-004'], spotifyId: '4FHSuYWyoH9EsFalVIEaOC' },
  { id: 'narkosis-spektre', title: 'Narkosis / Spektre (Prada FW21 Menswear Version)', artist: 'Plastikman', bpm: 120, category: 'A', house: 'Prada', show: 'FW21 menswear', sourceIds: ['SRC-004'], spotifyId: '7n119O1Dyg6tpqgi2GMGrO' },
  { id: 'gimme-more-bfrnd', title: 'Gimme More (BFRND Remix)', artist: 'Britney Spears, BFRND', bpm: 113, category: 'A', house: 'Balenciaga', show: 'Summer 25', sourceIds: ['SRC-001', 'SRC-002'], spotifyId: '7pNCrChCoVAF7u3MAzLPzB' },
  { id: 'runway', title: 'Runway', artist: 'La Femme', bpm: 120, bpmNote: 'songbpm 120 and Deezer 119.8; FreqBlog read 143.5 at low confidence.', category: 'B', house: 'Celine', show: 'SS19, Slimane debut, 28 Sep 2018', sourceIds: ['SRC-007'], spotifyId: '1JJwRgKGT07bDCllHXi3j2' },
  { id: 'work-bitch', title: 'Work Bitch', artist: 'Britney Spears', bpm: 128, category: 'B', house: 'Prada', show: 'SS14', sourceIds: ['SRC-006'], spotifyId: '3KliPMvk1EvFZu9cvkj8p1' },
  { id: 'the-one-i-love', title: 'The One I Love', artist: 'R.E.M.', bpm: 128, category: 'C', house: 'Prada', show: 'Resort 2019', sourceIds: ['SRC-005'], spotifyId: '2fdfsGuqb6SBX5ocoBWHUd', versionNote: 'The show used an unplugged version; this is the studio recording.' },
  { id: 'losing-my-edge', title: 'Losing My Edge', artist: 'LCD Soundsystem', bpm: 116, category: 'C', house: 'Celine', show: 'Homme Summer 24 film', sourceIds: ['SRC-009'], spotifyId: '1XlDNpWy8dyEljyRd0RC2J', versionNote: 'The film used an extended version made for it; this is the 2005 album version.' },
  { id: 'hello-operator', title: 'Hello Operator', artist: 'The White Stripes', bpm: 93, category: 'C', house: 'Celine', show: 'Winter 23, The Wiltern, 8 Dec 2022', sourceIds: ['SRC-008'], spotifyId: '7zPxIh1c3kJaNwmjdZ3GQX', versionNote: 'The show used a version made for it (sources disagree on the producer); this is the 2000 De Stijl original.' },
  { id: 'mad-world', title: 'Mad World', artist: 'Gary Jules', bpm: 87, category: 'D', house: 'Prada', show: 'Resort 2019', sourceIds: ['SRC-005'], spotifyId: '3JOVTQ5h8HGFnDdp4VT3MP' },
  { id: 'wake-up', title: 'Wake Up', artist: 'Mad Season', bpm: 78, category: 'D', house: 'Prada', show: 'Resort 2019', sourceIds: ['SRC-005'], spotifyId: '5xhQOnyRJfRywbEwpkgoTy' },
  { id: 'love-in-e-minor', title: 'Love in E Minor', artist: 'BFRND, Gustave Rudman', bpm: null, category: 'D', house: 'Balenciaga', show: 'AW22 couture', sourceIds: ['SRC-003'], spotifyId: '06yaQUWxlYOrSibtN0ffxI' },
];

/** Open questions the sampler doesn't answer yet; shown so nothing reads as more certain than it is. */
export const SAMPLER_OPEN_QUESTIONS = [
  'The two Daft Punk Homework tracks at Prada Resort 2019 aren’t named in the source.',
  'Loewe has one confirmed track. Who scores Loewe’s shows is still to verify.',
  'Show edits for Hello Operator, Losing My Edge and The One I Love aren’t on streaming, so released versions stand in.',
];

// ── Manual edits ────────────────────────────────────────────────────────────

const bpmValue = z.number().min(30).max(250).nullable();
const trackEditSchema = z.object({
  category: z.enum(categoryIds).optional(),
  bpm: bpmValue.optional(),
  note: z.string().max(280).optional(),
  hidden: z.boolean().optional(),
});
const manualTrackSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  show: z.string().max(200),
  category: z.enum(categoryIds),
  bpm: bpmValue,
  sourceUrl: z.string().url().refine(url => url.startsWith('https://')).nullable(),
  note: z.string().max(280),
});
/** The most own picks this device keeps; past it the stored edits would no longer read back. */
export const MAX_PICKS = 50;
export const samplerEditsSchema = z.object({
  edits: z.record(z.string(), trackEditSchema),
  added: z.array(manualTrackSchema).max(MAX_PICKS),
});

export type TrackEdit = z.infer<typeof trackEditSchema>;
export type ManualTrack = z.infer<typeof manualTrackSchema>;
export type SamplerEdits = z.infer<typeof samplerEditsSchema>;
export const emptySamplerEdits = (): SamplerEdits => ({ edits: {}, added: [] });

/** Stored edits → valid edits. Anything unreadable starts the reader over rather than breaking the page. */
export function readSamplerEdits(stored: unknown): SamplerEdits {
  const parsed = samplerEditsSchema.safeParse(stored);
  return parsed.success ? parsed.data : emptySamplerEdits();
}

/** "" → null (free time); a tempo between 30 and 250 → rounded BPM; anything else → "invalid". */
export function parseBpm(text: string): number | null | 'invalid' {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 30 && value <= 250 ? Math.round(value) : 'invalid';
}

export type BandFit = { kind: 'in' | 'over' | 'under' | 'free' | 'open'; by?: number };

/** Where a tempo sits against its category's band. D is open; a free-time track has nothing to count. */
export function bandFit(category: CategoryId, bpm: number | null): BandFit {
  const band = RUNWAY_CATEGORIES[category].band;
  if (!band) return { kind: 'open' };
  if (bpm === null) return { kind: 'free' };
  if (bpm > band.max) return { kind: 'over', by: bpm - band.max };
  if (bpm < band.min) return { kind: 'under', by: band.min - bpm };
  return { kind: 'in' };
}

export const bandFitLabel = (fit: BandFit) =>
  fit.kind === 'in' ? 'In band' : fit.kind === 'over' ? `${fit.by} over band` : fit.kind === 'under' ? `${fit.by} under band` : fit.kind === 'free' ? 'Free time' : 'No band';

export type SamplerRow = {
  id: string;
  title: string;
  artist: string;
  house: string | null;
  show: string;
  category: CategoryId;
  bpm: number | null;
  bpmNote: string | null;
  fit: BandFit;
  origin: 'sourced' | 'manual';
  /** Which sourced values the reader changed by hand. */
  edited: ('category' | 'bpm')[];
  hidden: boolean;
  note: string;
  versionNote: string | null;
  sources: SamplerSource[];
  /** A manual pick's own source link, if the reader gave one. */
  sourceUrl: string | null;
  spotifyUrl: string;
};

const spotifySearch = (title: string, artist: string) => `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;

/** Sourced tracks with the reader's overrides applied, then their own picks, in running order. */
export function resolveSampler(edits: SamplerEdits, tracks: SamplerTrack[] = SAMPLER_TRACKS, sources: SamplerSource[] = SAMPLER_SOURCES): SamplerRow[] {
  const sourced = tracks.map((track): SamplerRow => {
    const edit = edits.edits[track.id] ?? {};
    const category = edit.category ?? track.category;
    const bpm = edit.bpm !== undefined ? edit.bpm : track.bpm;
    const edited = [
      ...(edit.category !== undefined && edit.category !== track.category ? ['category' as const] : []),
      ...(edit.bpm !== undefined && edit.bpm !== track.bpm ? ['bpm' as const] : []),
    ];
    return {
      id: track.id, title: track.title, artist: track.artist, house: track.house, show: track.show, category, bpm,
      bpmNote: edited.includes('bpm') ? null : track.bpmNote ?? null,
      fit: bandFit(category, bpm), origin: 'sourced', edited, hidden: edit.hidden ?? false, note: edit.note ?? '',
      versionNote: track.versionNote ?? null,
      sources: track.sourceIds.flatMap(id => sources.filter(source => source.id === id)),
      sourceUrl: null, spotifyUrl: `https://open.spotify.com/track/${track.spotifyId}`,
    };
  });
  const manual = edits.added.map((track): SamplerRow => {
    const edit = edits.edits[track.id] ?? {};
    return {
      id: track.id, title: track.title, artist: track.artist, house: null, show: track.show, category: track.category, bpm: track.bpm,
      bpmNote: null, fit: bandFit(track.category, track.bpm), origin: 'manual', edited: [], hidden: edit.hidden ?? false, note: track.note,
      versionNote: null, sources: [], sourceUrl: track.sourceUrl, spotifyUrl: spotifySearch(track.title, track.artist),
    };
  });
  return [...sourced, ...manual];
}

/** Save a change to a sourced track. A value equal to the sourced one isn't an override, so it's dropped. */
export function withTrackEdit(edits: SamplerEdits, id: string, patch: TrackEdit): SamplerEdits {
  const sourced = SAMPLER_TRACKS.find(track => track.id === id);
  const next: TrackEdit = { ...edits.edits[id], ...patch };
  if (sourced && next.category === sourced.category) delete next.category;
  if (sourced && next.bpm === sourced.bpm) delete next.bpm;
  if (next.note === '') delete next.note;
  if (next.hidden === false) delete next.hidden;
  const rest = Object.fromEntries(Object.entries(edits.edits).filter(([key]) => key !== id));
  return { ...edits, edits: Object.keys(next).length ? { ...rest, [id]: next } : rest };
}

export const withoutTrackEdit = (edits: SamplerEdits, id: string): SamplerEdits =>
  ({ ...edits, edits: Object.fromEntries(Object.entries(edits.edits).filter(([key]) => key !== id)) });

/** Appends an own pick; at MAX_PICKS the edits come back unchanged, so storing them never wipes the rest. */
export function withManualTrack(edits: SamplerEdits, track: Omit<ManualTrack, 'id'>, id = `manual-${Date.now().toString(36)}`): SamplerEdits {
  if (edits.added.length >= MAX_PICKS) return edits;
  return { ...edits, added: [...edits.added, manualTrackSchema.parse({ ...track, id })] };
}

/** A manual pick is the reader's own record, so changes rewrite it rather than layering an override. */
export const withManualTrackUpdate = (edits: SamplerEdits, id: string, patch: Partial<Pick<ManualTrack, 'category' | 'bpm' | 'note'>>): SamplerEdits =>
  ({ ...edits, added: edits.added.map(track => (track.id === id ? manualTrackSchema.parse({ ...track, ...patch }) : track)) });

export const withoutManualTrack = (edits: SamplerEdits, id: string): SamplerEdits =>
  ({ added: edits.added.filter(track => track.id !== id), edits: withoutTrackEdit(edits, id).edits });

/** The running order as CSV, for Contentful or a spreadsheet. Manual picks say so. */
export function samplerCsv(rows: SamplerRow[]) {
  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ['Order', 'Category', 'Track', 'Artist', 'BPM', 'Band fit', 'House', 'Show', 'Origin', 'Edited', 'Sources', 'Spotify', 'Note'];
  return [header.join(','), ...rows.map((row, index) => [
    String(index + 1), row.category, row.title, row.artist, row.bpm === null ? 'free time' : String(row.bpm), bandFitLabel(row.fit),
    row.house ?? '', row.show, row.origin, row.edited.join(' '),
    row.origin === 'manual' ? row.sourceUrl ?? 'unsourced' : row.sources.map(source => `${source.id} ${source.url}`).join(' '),
    row.spotifyUrl, row.note,
  ].map(esc).join(','))].join('\n');
}
