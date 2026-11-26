// Server wiring for approved-article retrieval: the configured embedding model, Supabase's
// match_article_chunks, a cache of query vectors and a per-visitor limit on new embedding calls.
// Off (keyword ranking only) when embeddings or Supabase aren't configured.

import { toVector } from './article-rag';
import { NO_RETRIEVAL, retrieveApprovedArticles, type Retrieval, type RetrievalDeps } from './article-retrieval';
import { createRateLimiter } from './rate-limit';

const DAY_MS = 24 * 60 * 60 * 1000;
// A repeated search reuses its vector for a day, so only new searches cost an embedding call.
const vectors = new Map<string, { at: number; vector: Promise<number[]> }>();
// Embedding a search is cheap but not free: each visitor gets 60 new ones an hour, then the keyword ranking alone.
const limiter = createRateLimiter({ limit: 60, windowMs: 60 * 60_000 });

export async function retrieveForQuery(query: string, visitor: string): Promise<Retrieval> {
  const { getEmbeddingConfig, embedTexts } = await import('./ai/embeddings.server');
  const { getDb } = await import('./db.server');
  let config, db;
  try { config = getEmbeddingConfig(); db = getDb(); } catch { return NO_RETRIEVAL; }
  if (!config || !db) return NO_RETRIEVAL;
  const key = `${config.label}\n${query}`;
  const saved = vectors.get(key);
  const fresh = saved && Date.now() - saved.at < DAY_MS;
  if (!fresh && !limiter.allow(visitor)) return NO_RETRIEVAL;

  const deps: RetrievalDeps = {
    embedQuery() {
      if (fresh) return saved.vector;
      const vector = embedTexts(config, [query], 'query', AbortSignal.timeout(8000)).then(([first]) => first!);
      vectors.set(key, { at: Date.now(), vector });
      vector.catch(() => vectors.delete(key)); // a failed call is retried next time, not remembered
      if (vectors.size > 1000) vectors.delete(vectors.keys().next().value!);
      return vector;
    },
    async matchChunks(embedding, count) {
      const { data, error } = await db.rpc('match_article_chunks', { query_embedding: toVector(embedding), filter_model: config.label, match_count: count });
      if (error) throw new Error(`match_article_chunks: ${error.message}`);
      return data ?? [];
    },
  };
  return retrieveApprovedArticles(query, deps);
}
