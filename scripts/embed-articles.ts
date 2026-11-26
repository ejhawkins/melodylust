// Chunks and embeds the APPROVED articles in Supabase for semantic retrieval (docs/rag-article-search.md):
//   npm run db:embed              embed new and changed chunks, delete stale ones
//   npm run db:embed -- --dry-run show what would change; no embedding calls, no writes
// Only approved articles are read; candidates are never embedded. A chunk whose text and model are
// unchanged (same content_hash) is skipped, so running it again costs nothing. Needs the
// supabase/migrations/20261126120000_article_chunks_pgvector.sql migration.
// Prints counts only, never a key or other .env value.

import { createClient } from '@supabase/supabase-js';
import { createSupabaseFetch } from '../src/lib/supabase-fetch.ts';
import { chunkApprovedArticles, contentHash, planEmbedding, toVector, type ArticleRow, type StoredChunk } from '../src/lib/article-rag.ts';
import { findSpotifyContent } from '../src/lib/ai-input-guard.ts';
import { embedTexts, getEmbeddingConfig } from '../src/lib/ai/embeddings.server.ts';

const dryRun = process.argv.includes('--dry-run');
const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.'); process.exit(1); }
const config = getEmbeddingConfig();
if (!config) { console.error('No embedding model: set GEMINI_API_KEY or OPENAI_API_KEY in .env (or MELODYLUST_EMBEDDING_PROVIDER).'); process.exit(1); }
const db = createClient(url, key, { global: { fetch: createSupabaseFetch(key) }, auth: { persistSession: false, autoRefreshToken: false } });

async function readAll<T>(table: string, columns: string, approvedOnly: boolean): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = db.from(table).select(columns).order('id').range(offset, offset + 499);
    if (approvedOnly) query = query.eq('status', 'approved');
    const { data, error } = await query;
    if (error) { console.error(`${table}: ${error.message}`); process.exit(1); }
    rows.push(...(data as T[]));
    if (!data || data.length < 500) return rows;
  }
}

const articles = await readAll<ArticleRow>('articles', 'id,tracker_id,url,title,summary,status', true);
const stored = await readAll<StoredChunk & { embedding_model: string }>('article_chunks', 'id,article_id,chunk_index,content_hash,embedding_model', false);

// chunkApprovedArticles drops anything not approved, a second guard on top of the query's filter.
const chunks = chunkApprovedArticles(articles).filter(chunk => {
  if (!findSpotifyContent(chunk.content)) return true;
  console.warn(`Skipped article ${chunk.article_id} chunk ${chunk.chunk_index}: it carries a Spotify link or URI.`);
  return false;
});
const wanted = await Promise.all(chunks.map(async chunk => ({ ...chunk, content_hash: await contentHash(config.label, chunk.content) })));
const plan = planEmbedding(wanted, stored);
console.log(`${articles.length} approved articles → ${wanted.length} chunks (${config.label}): ${plan.embed.length} to embed, ${plan.unchanged} unchanged, ${plan.remove.length} stale.`);
if (dryRun) process.exit(0);

for (let start = 0; start < plan.embed.length; start += 50) {
  const batch = plan.embed.slice(start, start + 50);
  const vectors = await embedTexts(config, batch.map(chunk => chunk.content), 'document');
  const rows = batch.map((chunk, index) => ({ ...chunk, embedding_model: config.label, embedding: toVector(vectors[index]!), embedded_at: new Date().toISOString() }));
  const { error } = await db.from('article_chunks').upsert(rows, { onConflict: 'article_id,chunk_index' });
  if (error) { console.error(`article_chunks: ${error.message}`); process.exit(1); }
  console.log(`Embedded ${Math.min(start + 50, plan.embed.length)} of ${plan.embed.length}.`);
}
for (let start = 0; start < plan.remove.length; start += 200) {
  const { error } = await db.from('article_chunks').delete().in('id', plan.remove.slice(start, start + 200));
  if (error) { console.error(`article_chunks: ${error.message}`); process.exit(1); }
}
console.log(`Done. Embedded ${plan.embed.length}, removed ${plan.remove.length}.`);
