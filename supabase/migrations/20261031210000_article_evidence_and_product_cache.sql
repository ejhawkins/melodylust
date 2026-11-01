-- The server's evidence notebook and key/value cache. article_evidence keeps what the AI read in each article, so
-- it's read only once; product_cache keeps Farfetch searches for a day and the Runway Songs show notes. The old core
-- migration created them, and the Lovable sync removed it when drizzle took over articles and artists. Everything is
-- "if not exists", so a database that already has them is unchanged.
--
-- Row Level Security is on with no public policies: only the server, with the secret key, can read or write them.

create table if not exists public.article_evidence (
  fingerprint text primary key,                 -- article text + which AI read it
  reader text not null,                         -- short code for the AI/model/instructions
  article_url text not null,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists article_evidence_reader_idx on public.article_evidence (reader);

create table if not exists public.product_cache (
  key text primary key,                         -- e.g. "off-white|jacket|1" or "show-notes|v1|loewe|spring-summer|2021"
  products jsonb not null,
  saved_at timestamptz not null default now()
);

alter table public.article_evidence enable row level security;
alter table public.product_cache enable row level security;
