-- Votes for the Fit Compass ("My way to wear it") in the Fashion section. Lovable created this table in its own
-- database (drizzle/migrations/0005_create_style_votes.sql); this is the same table for the project the local
-- .env and Vercel use, where every vote read or write otherwise answers 404 "could not find the table".
-- Everything is "if not exists", so a database that already has it is unchanged.
--
-- Row Level Security is on with no public policies: only the server, with the secret key, can read or write it,
-- and it only ever returns totals, never who voted.

create table if not exists public.style_votes (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,                        -- the piece, e.g. the statement coat
  look_id text not null,                        -- which of its four looks got the vote
  voter text not null,                          -- a random id kept in the reader's browser, not an account
  created_at timestamptz not null default now(),
  constraint style_votes_one_per_item unique (item_id, voter)   -- one vote a reader per piece; voting again moves it
);

grant all on public.style_votes to service_role;
alter table public.style_votes enable row level security;

-- Tell the API about the new table straight away instead of waiting for its cache to refresh.
notify pgrst, 'reload schema';
