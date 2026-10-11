-- Fix: replace the empty, mis-shaped "articles" table left by a partial paste.
-- Run once in Supabase → SQL Editor. It only touches public.articles, and stops
-- (deleting nothing) if that table has any rows.

do $$
begin
  if exists (select 1 from public.articles limit 1) then
    raise exception 'articles has rows — not dropping it. Ask before changing it.';
  end if;
end
$$;

drop table public.articles;

create table public.articles (
  id bigint generated always as identity primary key,
  tracker_id text unique,
  url text not null unique,
  publication text not null,
  published_at date not null,
  title text not null,
  summary text not null default '',
  categories text[] not null default '{}',
  status text not null default 'approved'
    check (status in ('approved', 'candidate', 'rejected')),
  source text not null default 'sheet'
    check (source in ('sheet', 'scout', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_status_idx on public.articles (status);
alter table public.articles enable row level security;
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
create trigger articles_touch_updated_at
  before update on public.articles
  for each row execute function public.touch_updated_at();
