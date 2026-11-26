// Text embeddings for approved-article retrieval. Server-only: the key is read inside each call and never
// reaches the browser. Imports use .ts extensions so `node scripts/embed-articles.ts` can run this directly.
//
// Provider: MELODYLUST_EMBEDDING_PROVIDER=gemini|openai, else Gemini when GEMINI_API_KEY (or
// GOOGLE_GENERATIVE_AI_API_KEY) is set, else OpenAI when OPENAI_API_KEY is set, else none (retrieval is off).
// MELODYLUST_EMBEDDING_MODEL overrides the model. Every vector has EMBEDDING_DIMENSIONS numbers.

import { EMBEDDING_DIMENSIONS } from '../article-rag.ts';
import { assertNoSpotifyContent } from '../ai-input-guard.ts';

export type EmbeddingConfig = { provider: 'gemini' | 'openai'; model: string; /** Stored with each chunk; the query only matches chunks with the same label. */ label: string };

const geminiKey = () => process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENERATIVE_AI_API_KEY'] || '';

export function getEmbeddingConfig(): EmbeddingConfig | null {
  const chosen = process.env['MELODYLUST_EMBEDDING_PROVIDER'];
  const provider = chosen === 'gemini' || chosen === 'openai' ? chosen
    : chosen ? null
    : geminiKey().trim() ? 'gemini' : process.env['OPENAI_API_KEY']?.trim() ? 'openai' : null;
  if (!provider) return null;
  if (provider === 'gemini' && !geminiKey().trim()) return null;
  if (provider === 'openai' && !process.env['OPENAI_API_KEY']?.trim()) return null;
  const model = process.env['MELODYLUST_EMBEDDING_MODEL'] || (provider === 'gemini' ? 'gemini-embedding-001' : 'text-embedding-3-small');
  return { provider, model, label: `${provider}:${model}:${EMBEDDING_DIMENSIONS}` };
}

/** Embeds article chunks ('document') or a search ('query'). Refuses Spotify content. Throws on any provider
 *  failure; callers on the query path catch it and fall back to the keyword ranking. */
export async function embedTexts(config: EmbeddingConfig, values: string[], kind: 'document' | 'query', signal?: AbortSignal): Promise<number[][]> {
  if (!values.length) return [];
  assertNoSpotifyContent(values, 'the embedding model');
  const { embedMany } = await import('ai');
  const common = { values, dimensions: EMBEDDING_DIMENSIONS, maxRetries: 1, ...(signal ? { abortSignal: signal } : {}) };
  let embeddings: number[][];
  if (config.provider === 'gemini') {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    const google = createGoogleGenerativeAI({ apiKey: geminiKey() });
    ({ embeddings } = await embedMany({
      ...common, model: google.embedding(config.model),
      providerOptions: { google: { taskType: kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBEDDING_DIMENSIONS } },
    }));
  } else {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const openai = createOpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
    ({ embeddings } = await embedMany({ ...common, model: openai.embedding(config.model) }));
  }
  if (embeddings.length !== values.length || embeddings.some(vector => vector.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error(`The embedding model returned the wrong shape (expected ${values.length} × ${EMBEDDING_DIMENSIONS}).`);
  }
  return embeddings;
}
