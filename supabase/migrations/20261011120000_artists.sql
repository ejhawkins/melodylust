-- Artists and artist submissions. Run once: Supabase → SQL Editor → paste → Run.
-- Safe to run again. Like the other MelodyLust tables, Row Level Security is on with no
-- public policies: only the site's server (secret key) can read or write these tables.
--
-- Finding an artist here says nothing about fashion. Fashion evidence and recommendation
-- scoring stay in articles / article_evidence and are never derived from these rows.

-- 1. Approved artists — what search suggests first.
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),       -- stable MelodyLust artist ID
  name text not null,
  normalized_name text not null,                        -- lower-case, accents/punctuation removed, for search
  disambiguation text,                                  -- e.g. "US R&B singer", to tell same-name artists apart
  genres text[] not null default '{}',
  image_url text,
  country text,
  status text not null default 'approved' check (status in ('approved', 'hidden')),
  source text not null default 'melodylust',            -- where the record came from: melodylust, freqblog, musicbrainz…
  source_id text,                                       -- that source's own identifier, kept verbatim
  source_url text,                                      -- official profile or source page
  provenance jsonb not null default '{}',               -- how and when it was obtained (provider, request, sample ids…)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists artists_normalized_name_idx on public.artists (normalized_name text_pattern_ops);
create index if not exists artists_status_idx on public.artists (status);

-- 2. Artist submissions — readers' suggestions, held for review. Never auto-approved.
create table if not exists public.artist_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  profile_url text not null,                            -- official artist or music profile
  profile_host text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'duplicate')),
  submitter_hash text,                                  -- salted hash of the submitter's IP (spam review); never the raw IP
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- At most one pending submission per artist name and per profile link, enforced by the
-- database so two people submitting at the same moment can't create duplicates.
create unique index if not exists artist_submissions_pending_name on public.artist_submissions (normalized_name) where status = 'pending';
create unique index if not exists artist_submissions_pending_url on public.artist_submissions (profile_url) where status = 'pending';

alter table public.artists enable row level security;
alter table public.artist_submissions enable row level security;

-- Keep artists.updated_at current (same helper as the articles table).
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
drop trigger if exists artists_touch_updated_at on public.artists;
create trigger artists_touch_updated_at
  before update on public.artists
  for each row execute function public.touch_updated_at();
