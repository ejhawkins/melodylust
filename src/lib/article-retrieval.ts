// The query path of semantic article retrieval, with its effects passed in so tests drive it without a
// database or an API key. The server wiring (real embeddings, Supabase, cache, rate limit) is
// article-retrieval.server.ts.

import type { AIStyleInput } from './ai-style';
import { assertNoSpotifyContent } from './ai-input-guard';
import { mergeRankings, readMatches, retrievalQuery, type MatchRow, type RetrievedArticle } from './article-rag';

export type RetrievalDeps = {
  /** The query's vector, from the same model the stored chunks were embedded with. */
  embedQuery(text: string): Promise<number[]>;
  /** public.match_article_chunks: approved chunks only, nearest first. */
  matchChunks(embedding: number[], count: number): Promise<MatchRow[]>;
};
/** ok: retrieval ran. off: not configured or over the visitor's limit. fallback: it failed, so the keyword ranking stands alone. */
export type Retrieval = { status: 'ok' | 'off' | 'fallback'; articles: RetrievedArticle[]; chunkIds: string[] };

export const NO_RETRIEVAL: Retrieval = { status: 'off', articles: [], chunkIds: [] };

/** Never throws: any embedding or vector-query failure returns the fallback and the caller keeps its keyword ranking. */
export async function retrieveApprovedArticles(query: string, deps: RetrievalDeps | null, { count = 8, minSimilarity = 0.3 } = {}): Promise<Retrieval> {
  if (!deps || !query.trim()) return NO_RETRIEVAL;
  try {
    assertNoSpotifyContent(query, 'the embedding model');
    const rows = await deps.matchChunks(await deps.embedQuery(query), count);
    const articles = readMatches(rows, minSimilarity);
    return { status: 'ok', articles, chunkIds: articles.flatMap(article => article.chunkIds).sort() };
  } catch (failure) {
    console.error('[RAG] retrieval failed; using the keyword ranking', failure instanceof Error ? failure.message : failure);
    return { status: 'fallback', articles: [], chunkIds: [] };
  }
}

/** The stylist's input: the reader's request with retrieval merged into its approved articles. Refuses Spotify
 *  content before anything else happens. Quotes are still checked later against these same articles. */
export function withRetrieval(input: AIStyleInput, retrieval: Retrieval): AIStyleInput {
  const merged = retrieval.articles.length ? { ...input, articles: mergeRankings(input.articles, retrieval.articles, 8) } : input;
  assertNoSpotifyContent(merged, 'the stylist model');
  return merged;
}

export const styleRetrievalQuery = (input: AIStyleInput) => retrievalQuery(input);
