-- Vogue Runway designer names and Gemini-scouted runway song candidates.
-- RLS has no public policies: imports and candidate review use the server secret only.

create table if not exists public.designers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  source text not null check (source in ('vogue-runway', 'manual')),
  source_id text not null,
  source_url text not null,
  status text not null default 'active' check (status in ('active', 'hidden')),
  discovery_status text not null default 'pending' check (discovery_status in ('pending', 'complete', 'error')),
  discovered_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists designers_radio_idx on public.designers (status, discovery_status, name);
create index if not exists designers_normalized_name_idx on public.designers (normalized_name text_pattern_ops);

create table if not exists public.runway_song_candidates (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designers(id) on delete cascade,
  title text not null,
  artist text not null,
  show_name text,
  show_season text,
  evidence_summary text not null,
  source_url text not null,
  source_title text,
  spotify_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  provider text not null default 'gemini',
  model text not null,
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (designer_id, title, artist, source_url)
);
create index if not exists runway_song_candidates_review_idx on public.runway_song_candidates (status, created_at);

alter table public.designers enable row level security;
alter table public.runway_song_candidates enable row level security;

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
drop trigger if exists designers_touch_updated_at on public.designers;
create trigger designers_touch_updated_at
  before update on public.designers
  for each row execute function public.touch_updated_at();