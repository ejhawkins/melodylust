# Semantic article search (RAG over approved articles)

The stylist step (Gemini by default) receives up to 8 **approved** articles for a searched artist. Until now they came from the existing evidence ranking only (`searchEvidence`: evidence strength, then lift). Semantic retrieval adds a second ranking signal. The search and quiz text is embedded, the nearest approved article chunks are found with pgvector, and the two rankings are merged.

Nothing about trust changes:
- **Approved articles only.** Candidates are never chunked or embedded.
- **Same quote check.** An "evidence" idea still has to quote an exact substring of a named, supplied article (`readAIStyle` in `src/lib/ai-style.ts`). Retrieved articles go to the model whole (title and summary), so their quotes are checked like any other.
- **Always a fallback.** If retrieval fails or is switched off, the old ranking is used alone, exactly as before.

## How it works

| Step | Where |
| --- | --- |
| `article_chunks` table (vector(768), HNSW cosine index) and `match_article_chunks(query_embedding, filter_model, match_count)` | `supabase/migrations/20261126120000_article_chunks_pgvector.sql` |
| Chunking, change detection, match-row reading, rank merging | `src/lib/article-rag.ts` (pure, no imports) |
| Embedding provider (Gemini `gemini-embedding-001` or OpenAI `text-embedding-3-small`, 768 dimensions) | `src/lib/ai/embeddings.server.ts` |
| `npm run db:embed`: embeds new or changed approved chunks and deletes stale ones | `scripts/embed-articles.ts` |
| Query path with its dependencies passed in; never throws | `src/lib/article-retrieval.ts` |
| Server wiring: query-vector cache and per-visitor limit | `src/lib/article-retrieval.server.ts` |
| Called before the stylist's cache lookup | `src/lib/ai-style.functions.ts` |
| Refuses Spotify links and URIs | `src/lib/ai-input-guard.ts` |

### Approved only, three times over

1. `scripts/embed-articles.ts` reads `articles` with `status = 'approved'`, and `chunkArticle` returns no chunks for any other status.
2. `match_article_chunks` joins each chunk back to `articles` and filters on `a.status = 'approved'`. An article that loses approval drops out of retrieval **immediately**, before the next embed run deletes its chunks.
3. `readMatches` drops any row that isn't approved.

The table has Row Level Security on with no policies. Only `service_role` (the server's secret key) can read it or run the match function.

### Ranking

`mergeRankings` uses reciprocal-rank fusion (k = 60), and the existing evidence ranking counts double. As a result:
- Every article the evidence ranking found outranks one that only retrieval found.
- Retrieval can reorder those articles (one found by both rises) and can fill empty places, up to 8.
- Retrieval never pushes an evidence-ranked article out.

The search text is the artist, their genres and the reader's quiz preferences (`retrievalQuery`). The default similarity floor is 0.3.

### Re-embedding

Each chunk stores `content_hash`, a sha256 of the embedding model label plus the chunk text.
- `npm run db:embed` embeds only chunks whose hash changed or that are new.
- It deletes chunks that no longer exist: the article lost approval or was removed, or its summary got shorter.
- Changing the provider or model changes every hash, so everything is re-embedded once.
- Queries only match chunks with their own model label (`filter_model`), so a half-finished switch can't compare vectors from two models.

### Fallback, caching and limits

- **Off.** No embedding key or no Supabase gives keyword ranking only.
- **Fallback.** The query is still answered with the keyword ranking if any of these happen:
  - the embedding call throws (quota, timeout, bad key);
  - the RPC fails (for example, the migration hasn't been applied yet);
  - the query carries Spotify content.

  The reason is logged as `[RAG] …`; keys are never logged.
- **Query vectors.** They're cached in memory for a day per server instance, so only new searches cost an embedding call. Each visitor gets 60 new query embeddings an hour; past that, retrieval is off for them and the keyword ranking stands.
- **The stylist's own cache key** (`aiStyleCacheKey`) now also includes the retrieved chunk IDs. A newly approved or re-embedded article gets a fresh answer, and without retrieval the key is unchanged.
- **The stylist's own limit** (20 new answers an hour per visitor) and its one-day answer cache are unchanged.

## Spotify policy guardrail

Spotify's Developer Policy forbids using the Spotify Platform or Spotify Content to train, or ingest into, an AI/ML model. So:
- **Nothing from Spotify is embedded, stored for retrieval or put in a prompt.** Chunks are article titles and summaries. Songs reach the stylist only as **titles from FreqBlog or the hand-written catalog**.
- **Songs are linked by ID only.** Playback (the embed, or the Web Playback SDK on the listening-room branch) loads the track itself. No Spotify response feeds back into AI input.
- **Runtime guard.** `assertNoSpotifyContent` (`src/lib/ai-input-guard.ts`) runs on every embedding call and on every stylist payload, retrieved articles included. A Spotify link (`*.spotify.com`, `spotify.link`), artwork (`*.scdn.co`) or a `spotify:track:` style URI makes the request fail closed: the embedding is refused and the stylist answers "unavailable", so the rule-based fallback outfit shows. Mentioning Spotify in prose is fine.
- **Static guard.** `src/lib/ai-input-guard.test.ts` walks the import graph from every AI entry point (stylist, retrieval, embeddings, the embed script, the client that builds the request). It fails if any reachable module:
  - has "spotify" in its filename (`spotify-api.ts`, `spotify-track.functions.ts`, the listening room's modules, and so on);
  - contains an endpoint that returns Spotify data (Web API, accounts, SDK, oEmbed, embed page).

  It also checks that the client sends song titles, not their Spotify links. To check the check: temporarily importing `./spotify-track.functions` into the retrieval module makes it fail.

## Setup

1. **Apply the migration** (owner only, once): Supabase dashboard → SQL editor → run `supabase/migrations/20261126120000_article_chunks_pgvector.sql`. Or use `supabase db push` if the CLI is linked. It enables `vector` in the `extensions` schema.
2. **Embedding key** in the server `.env` (never committed). Use `GEMINI_API_KEY`, which the stylist already uses, or `OPENAI_API_KEY`. Optional overrides:
   - `MELODYLUST_EMBEDDING_PROVIDER=gemini|openai`
   - `MELODYLUST_EMBEDDING_MODEL`
3. **Embed the approved articles:**
   - `npm run db:embed -- --dry-run` shows the plan without any calls or writes.
   - `npm run db:embed` does the work. Run it again after `npm run db:articles` or after approving candidates. It's cheap when nothing changed.
4. **Production (Vercel).** The same key is already there if the stylist uses Gemini. The site works before step 3: retrieval just returns nothing until chunks exist.

## Turning it off

- Unset the embedding keys or set `MELODYLUST_EMBEDDING_PROVIDER=none`. Any unknown value turns it off. The stylist then behaves exactly as before.
- The table and function can stay. To remove them: `drop function public.match_article_chunks(extensions.vector, text, integer); drop table public.article_chunks;`

## Tests

| Test | What it checks |
| --- | --- |
| `src/lib/article-rag.test.ts` | Candidates are never chunked; non-approved match rows are dropped; the SQL filters on approved and is revoked from `anon`; only changed chunks re-embed and stale ones are deleted; the merge keeps every evidence-ranked article; embedding or RPC failures fall back to the keyword ranking; different chunk IDs change the cache key; quotes from retrieved articles must still match exactly. |
| `src/lib/ai-input-guard.test.ts` | The Spotify import-graph and endpoint checks, the title-only client, and the runtime guard on prompts and query embeddings. |

The migration was checked on a local Postgres 18 with a stand-in `vector` type. Candidates and other-model chunks were excluded, and `anon` was refused. The HNSW index line needs real pgvector, which Supabase has.
