import { directorNames, knownDesigner, unknownDesigner } from './designer-portraits';
import { spotifyTrackId } from './runway-archive';
import type { CategoryId } from './runway-sampler';
import type { Designer, RunwaySong } from './runway-songs';

export type DesignerRadioRow = {
  id: string;
  title: string;
  artist: string;
  category: string | null;
  show_name: string | null;
  show_season: string | null;
  spotify_url: string | null;
  status: string;
  designer: { name?: unknown } | { name?: unknown }[] | null;
  provenance?: { creative_director?: unknown } | null;
};

const CATEGORIES = new Set<string>(['A', 'B', 'C', 'D']);
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;

function designerName(value: DesignerRadioRow['designer']) {
  const designer = Array.isArray(value) ? value[0] : value;
  return text(designer?.name);
}

function showDetails(row: DesignerRadioRow) {
  const label = text(row.show_season) ?? text(row.show_name);
  const yearMatch = /(?:19|20)\d{2}/.exec(`${row.show_season ?? ''} ${row.show_name ?? ''}`);
  if (!label || !yearMatch) return null;
  const season = label.replace(yearMatch[0], '').replace(/[\s,–—/-]+$/, '').trim();
  return season ? { season, year: Number(yearMatch[0]) } : null;
}

/** The creative directors each approved row names, for looking up their portraits before the songs are built. */
export const rowDirectors = (rows: DesignerRadioRow[]) => [...new Set(rows.flatMap(row => directorNames(row.provenance?.creative_director)))];

/** `portraits` holds what Wikipedia found per director name; curated directors and unfound names need no entry. */
export function designerRadioSongs(rows: DesignerRadioRow[], portraits: ReadonlyMap<string, Designer> = new Map()): RunwaySong[] {
  return rows.flatMap(row => {
    const title = text(row.title);
    const artist = text(row.artist);
    const house = designerName(row.designer);
    const show = showDetails(row);
    const trackId = spotifyTrackId(row.spotify_url ?? '');
    if (row.status !== 'approved' || !title || !artist || !house || !show || !trackId || !row.category || !CATEGORIES.has(row.category)) return [];

    return [{
      id: `designer-radio-${row.id}`,
      name: title,
      version: null,
      artist,
      house,
      season: show.season,
      year: show.year,
      designers: directorNames(row.provenance?.creative_director).map(name => knownDesigner(name) ?? portraits.get(name) ?? unknownDesigner(name)),
      category: row.category as CategoryId,
      spotifyUri: `spotify:track:${trackId}`,
      spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      looks: [],
    }];
  });
}