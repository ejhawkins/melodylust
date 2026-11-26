-- Semantic retrieval over APPROVED articles (docs/rag-article-search.md).
--
-- article_chunks holds one embedding per chunk of an approved article, written only by
-- `npm run db:embed` (scripts/embed-articles.ts). Candidates are never chunked or embedded, and
-- match_article_chunks joins back to articles and returns only rows whose article is approved now, so an
-- article that loses approval drops out of retrieval immediately, before the next embed run deletes its chunks.
--
-- Server only: Row Level Security is on with no policies, and only service_role may run the match function.
-- Nothing here stores Spotify data (Spotify Developer Policy): chunks are article titles and summaries.

create extension if not exists vector with schema extensions;

create table if not exists public.article_chunks (
  id bigint generated always as identity primary key,
  article_id bigint not null references public.articles (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  content_hash text not null,                   -- sha256 of model label + content: unchanged chunks aren't re-embedded
  embedding_model text not null,                -- e.g. "gemini:gemini-embedding-001:768"; queries match their own model only
  embedding extensions.vector(768) not null,
  embedded_at timestamptz not null default now(),
  unique (article_id, chunk_index)
);

create index if not exists article_chunks_embedding_idx
  on public.article_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists article_chunks_model_idx on public.article_chunks (embedding_model);

alter table public.article_chunks enable row level security;
revoke all on public.article_chunks from anon, authenticated;
grant all on public.article_chunks to service_role;

-- Top-k approved chunks by cosine similarity (1 - cosine distance) for one embedding model.
create or replace function public.match_article_chunks(
  query_embedding extensions.vector(768),
  filter_model text,
  match_count integer default 8
)
returns table (
  chunk_id bigint,
  article_id bigint,
  tracker_id text,
  url text,
  title text,
  summary text,
  status text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select c.id, a.id, a.tracker_id, a.url, a.title, a.summary, a.status,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.article_chunks c
  join public.articles a on a.id = c.article_id
  where a.status = 'approved'
    and c.embedding_model = filter_model
  order by c.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 8), 1), 50);
$$;

revoke execute on function public.match_article_chunks(extensions.vector, text, integer) from public, anon, authenticated;
grant execute on function public.match_article_chunks(extensions.vector, text, integer) to service_role;
