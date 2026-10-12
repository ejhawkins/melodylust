// Live article discovery for a searched artist: the "Hearst" half of the hybrid search.
// Pure orchestration with injected steps, so it is tested without keys, network or a database.
// Found articles are saved as candidates only; nothing here approves an article or turns it into evidence.

import { readScoutCandidates, type ScoutCandidate } from './article-scout';

export type ScoutedArticle = Pick<ScoutCandidate, 'url' | 'publication' | 'published_at' | 'title' | 'summary'>;
export type LiveScoutResponse = {
  status: 'ok' | 'not_configured' | 'unavailable' | 'rate_limited';
  articles: ScoutedArticle[];
  /** true when a new web search ran for this answer; false when saved candidates were reused. */
  searched: boolean;
};

export type LiveScoutSteps = {
  /** Candidates already waiting for review that name this artist (free: no web search). */
  savedCandidates(artist: string): Promise<ScoutedArticle[]>;
  /** Every article URL already known (approved, candidate or rejected), so nothing is proposed twice. */
  knownUrls(): Promise<string[]>;
  /** Paid web search on the allowed publications; null when it may not run (no key or rate limit). */
  search(artist: string): Promise<{ payload: unknown; cited: string[] } | null>;
  save(articles: ScoutCandidate[]): Promise<void>;
};

const show = ({ url, publication, published_at, title, summary }: ScoutedArticle): ScoutedArticle => ({ url, publication, published_at, title, summary });

/** Saved candidates first; otherwise one web search, validated by readScoutCandidates and saved for review. */
export async function findArtistArticles(artist: string, steps: LiveScoutSteps): Promise<{ articles: ScoutedArticle[]; searched: boolean; rejected: number } | null> {
  const saved = await steps.savedCandidates(artist);
  if (saved.length) return { articles: saved.map(show), searched: false, rejected: 0 };
  const found = await steps.search(artist);
  if (!found) return null;
  const { accepted, rejected } = readScoutCandidates(found.payload, found.cited, await steps.knownUrls(), artist);
  await steps.save(accepted);
  return { articles: accepted.map(show), searched: true, rejected: rejected.length };
}

/** "Charli XCX" and " charli xcx " are the same scout. */
export const scoutKey = (artist: string) => artist.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

/** Escapes LIKE wildcards so an artist name is matched literally. */
export const likePattern = (artist: string) => `%${artist.trim().replace(/[\\%_]/g, character => `\\${character}`)}%`;
