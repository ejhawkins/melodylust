// Semantic retrieval over APPROVED articles: the pure half, shared by the embed script and the server.
// Plain TypeScript with no imports, so `node scripts/embed-articles.ts` runs it without a build step.
//
// - Only approved articles are ever chunked; candidates and anything else are dropped here, again by the
//   match function's `a.status = 'approved'` join, and a third time when its rows are read.
// - Retrieval is an extra ranking signal. It never replaces the evidence ranking (evidenceStrength, then lift)
//   and never adds a quote: Gemini still receives whole articles, and readAIStyle still checks every evidence
//   quote against the article text word for word.

/** Every stored vector has this many dimensions (the migration's vector(768)). Gemini and OpenAI both
 *  return 768 when asked, so switching provider re-embeds rather than needing a new column. */
export const EMBEDDING_DIMENSIONS = 768;
/** Approved articles are a title and a summary of a few hundred characters, so most are one chunk. */
export const CHUNK_CHARS = 900;

export type ArticleRow = { id: number; tracker_id: string | null; url: string; title: string; summary: string | null; status: string };
export type ArticleChunk = { article_id: number; chunk_index: number; content: string };
export type StoredChunk = { id: number; article_id: number; chunk_index: number; content_hash: string };

/** The id the rest of the site uses for an article (article-source.server.ts): the tracker id, or db:<row id>. */
export const articleKey = (row: Pick<ArticleRow, 'id' | 'tracker_id'>) => row.tracker_id || `db:${row.id}`;

/** Sentence-sized pieces of at most `max` characters; a single over-long sentence is cut at a space. */
function pieces(text: string, max: number): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [];
  const out: string[] = [];
  let current = '';
  for (const raw of sentences) {
    let sentence = raw.trim();
    while (sentence.length > max) {
      const cut = sentence.lastIndexOf(' ', max) > max / 2 ? sentence.lastIndexOf(' ', max) : max;
      if (current) { out.push(current); current = ''; }
      out.push(sentence.slice(0, cut).trim());
      sentence = sentence.slice(cut).trim();
    }
    if (!sentence) continue;
    if (current && current.length + 1 + sentence.length > max) { out.push(current); current = ''; }
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) out.push(current);
  return out;
}

/** An approved article as chunks; anything that isn't approved gives none. Every chunk starts with the
 *  title, so a chunk from the end of a long summary still says which article it belongs to. */
export function chunkArticle(row: ArticleRow, max = CHUNK_CHARS): ArticleChunk[] {
  if (row.status !== 'approved') return [];
  const title = row.title.replace(/\s+/g, ' ').trim();
  const body = pieces(row.summary ?? '', Math.max(200, max - title.length - 1));
  const texts = body.length ? body.map(part => `${title}\n${part}`) : [title];
  return texts.filter(Boolean).map((content, chunk_index) => ({ article_id: row.id, chunk_index, content }));
}

export const chunkApprovedArticles = (rows: ArticleRow[], max = CHUNK_CHARS) => rows.flatMap(row => chunkArticle(row, max));

/** sha256 of the embedding model and the chunk text: a changed article or a new model re-embeds, nothing else does. */
export async function contentHash(model: string, content: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${model}\n${content}`));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** What the embed script has to do: embed new or changed chunks, delete chunks that no longer exist
 *  (an article that lost approval, was removed, or got shorter). Unchanged chunks are left alone. */
export function planEmbedding(wanted: (ArticleChunk & { content_hash: string })[], stored: StoredChunk[]) {
  const have = new Map(stored.map(chunk => [`${chunk.article_id}:${chunk.chunk_index}`, chunk]));
  const want = new Set(wanted.map(chunk => `${chunk.article_id}:${chunk.chunk_index}`));
  const embed = wanted.filter(chunk => have.get(`${chunk.article_id}:${chunk.chunk_index}`)?.content_hash !== chunk.content_hash);
  return {
    embed,
    unchanged: wanted.length - embed.length,
    remove: stored.filter(chunk => !want.has(`${chunk.article_id}:${chunk.chunk_index}`)).map(chunk => chunk.id),
  };
}

/** pgvector's text form, which PostgREST passes straight to a vector column or argument. */
export function toVector(values: number[]) {
  if (values.length !== EMBEDDING_DIMENSIONS || !values.every(Number.isFinite)) throw new Error(`Expected ${EMBEDDING_DIMENSIONS} finite numbers.`);
  return `[${values.join(',')}]`;
}

/** One row of public.match_article_chunks. */
export type MatchRow = { chunk_id: number; article_id: number; tracker_id: string | null; url: string; title: string; summary: string | null; status: string; similarity: number };
export type RetrievedArticle = { id: string; title: string; summary: string; url: string; similarity: number; chunkIds: string[] };

/** Match rows → one entry per approved article, best similarity first. Rows that aren't approved, or fall
 *  under the floor, are dropped even though the SQL already filters them. */
export function readMatches(rows: MatchRow[], minSimilarity = 0): RetrievedArticle[] {
  const byArticle = new Map<string, RetrievedArticle>();
  for (const row of rows) {
    if (row.status !== 'approved' || !Number.isFinite(row.similarity) || row.similarity < minSimilarity) continue;
    const id = articleKey({ id: row.article_id, tracker_id: row.tracker_id });
    const seen = byArticle.get(id);
    if (seen) { seen.chunkIds.push(String(row.chunk_id)); seen.similarity = Math.max(seen.similarity, row.similarity); continue; }
    byArticle.set(id, { id, title: row.title, summary: row.summary ?? '', url: row.url, similarity: row.similarity, chunkIds: [String(row.chunk_id)] });
  }
  return [...byArticle.values()].sort((a, b) => b.similarity - a.similarity);
}

/** The search text for a styling request: who, which genres and the quiz's taste words. */
export const retrievalQuery = ({ artist, genres = [], preferences = [] }: { artist: string; genres?: string[]; preferences?: string[] }) =>
  [artist.trim(), genres.length ? `Genres: ${genres.join(', ')}` : '', preferences.length ? `Style: ${preferences.join(', ')}` : ''].filter(Boolean).join('\n');

type Ranked = { id: string; title: string; summary: string; url: string };
/** Reciprocal-rank fusion of the existing ranking (evidence strength, then lift) and retrieval. The existing
 *  ranking counts double, so an article it found always outranks one only retrieval found, and retrieval can
 *  reorder those articles or fill the empty places, never push one out. */
export function mergeRankings<T extends Ranked>(ranked: T[], retrieved: RetrievedArticle[], limit = 8): Ranked[] {
  const K = 60;
  const scores = new Map<string, { score: number; article: Ranked; first: number }>();
  ranked.forEach((article, index) => scores.set(article.id, { score: 2 / (K + index + 1), article: { id: article.id, title: article.title, summary: article.summary, url: article.url }, first: index }));
  retrieved.forEach((article, index) => {
    const seen = scores.get(article.id);
    if (seen) seen.score += 1 / (K + index + 1);
    else scores.set(article.id, { score: 1 / (K + index + 1), article: { id: article.id, title: article.title, summary: article.summary, url: article.url }, first: ranked.length + index });
  });
  return [...scores.values()].sort((a, b) => b.score - a.score || a.first - b.first).slice(0, limit).map(entry => entry.article);
}
