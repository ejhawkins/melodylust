-- MelodyLust core tables. Run once: Supabase → SQL Editor → paste → Run.
-- Safe to run again: everything is "if not exists" / "or replace".
--
-- Security: Row Level Security is switched on for every table and no public
-- policies are added, so browsers (publishable key) can't read or write these
-- tables at all. Only the site's server, using the secret key, can.

-- 1. Articles — replaces data/articles-tracker.csv, plus the scout's review queue.
create table if not exists public.articles (
  id bigint generated always as identity primary key,
  tracker_id text unique,                       -- the ID column from your Sheet
  url text not null unique,
  publication text not null,
  published_at date not null,
  title text not null,
  summary text not null default '',
  categories text[] not null default '{}',
  status text not null default 'approved'
    check (status in ('approved', 'candidate', 'rejected')),   -- candidate = waiting for your review
  source text not null default 'sheet'
    check (source in ('sheet', 'scout', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_status_idx on public.articles (status);

-- 2. Evidence notebook — what the AI read in each article, so it's read only once.
create table if not exists public.article_evidence (
  fingerprint text primary key,                 -- article text + which AI read it
  reader text not null,                         -- short code for the AI/model/instructions
  article_url text not null,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists article_evidence_reader_idx on public.article_evidence (reader);

-- 3. Product cache — Farfetch searches kept for a day to save RapidAPI requests.
create table if not exists public.product_cache (
  key text primary key,                         -- e.g. "off-white|jacket|1"
  products jsonb not null,
  saved_at timestamptz not null default now()
);

-- Lock every table to the server only.
alter table public.articles enable row level security;
alter table public.article_evidence enable row level security;
alter table public.product_cache enable row level security;

-- Keep articles.updated_at current on every edit.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at
  before update on public.articles
  for each row execute function public.touch_updated_at();
