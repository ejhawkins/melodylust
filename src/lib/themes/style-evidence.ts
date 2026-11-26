// Which approved evidence a style surfaces, and in what order. Pure; the AI step receives the result.
// A theme's evidenceStrengthMin drops weaker articles; within what's left, stronger evidence comes first and
// then articles naming the theme's garments. Nothing is added: this only filters and orders approved articles.

import { evidenceStrength, STRENGTH_RANK, type Association, type EvidenceStrength } from '../melodylust-evidence';
import { songCatalog, type Song } from '../song-recommendations';
import type { RoomTheme } from './theme-spec';

const MIN_RANK: Record<RoomTheme['content']['evidenceStrengthMin'], number> = { contextual: 0, 'quoted-together': 1, verified: 2 };

/** Each article's strongest tie to the searched artist; articles with no designer connection aren't in the map (contextual). */
export function articleStrengths(associations: Pick<Association, 'sources' | 'observations'>[]): Map<string, EvidenceStrength> {
  const out = new Map<string, EvidenceStrength>();
  for (const association of associations) {
    for (const source of association.sources) {
      const strength = evidenceStrength({ observations: association.observations.filter(o => o.article_id === source.id) });
      const seen = out.get(source.id);
      if (!seen || STRENGTH_RANK[strength] > STRENGTH_RANK[seen]) out.set(source.id, strength);
    }
  }
  return out;
}

const mentions = (text: string, keywords: string[]) => keywords.filter(keyword => text.toLowerCase().includes(keyword.toLowerCase())).length;

export function articlesForStyle<T extends { id: string; title: string; summary: string }>(articles: T[], strengths: Map<string, EvidenceStrength>, theme: RoomTheme | null): T[] {
  if (!theme) return articles;
  const rank = (article: T) => STRENGTH_RANK[strengths.get(article.id) ?? 'same_article'];
  const min = MIN_RANK[theme.content.evidenceStrengthMin];
  return articles
    .map((article, index) => ({ article, index, rank: rank(article), garments: mentions(`${article.title} ${article.summary}`, theme.content.garmentKeywords) }))
    .filter(entry => entry.rank >= min)
    .sort((a, b) => b.rank - a.rank || b.garments - a.garments || a.index - b.index)
    .map(entry => entry.article);
}

/** Song order for a style: the theme's setlist songs first, in slot order, then songs in its genres, then the rest. */
export function songsForStyle<T extends { song: Song }>(picks: T[], theme: RoomTheme | null): T[] {
  if (!theme) return picks;
  const slot = (song: Song) => theme.setlist.findIndex(entry => entry.catalogKey === `${song.title}|${song.artist}`);
  const inGenres = (song: Song) => song.genres.some(genre => theme.content.genres.includes(genre));
  const score = (song: Song) => (slot(song) >= 0 ? 100 - slot(song) : 0) + (inGenres(song) ? 10 : 0);
  return picks.map((pick, index) => ({ pick, index })).sort((a, b) => score(b.pick.song) - score(a.pick.song) || a.index - b.index).map(entry => entry.pick);
}

export const setlistSongs = (theme: RoomTheme) => theme.setlist.flatMap(entry => songCatalog.filter(song => `${song.title}|${song.artist}` === entry.catalogKey));
