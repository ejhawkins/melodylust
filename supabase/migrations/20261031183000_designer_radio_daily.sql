alter table public.designers
  add column if not exists radio_priority smallint
    check (radio_priority between 1 and 1000);

alter table public.runway_song_candidates
  add column if not exists category text
    check (category in ('A', 'B', 'C', 'D'));

alter table public.designers
  drop constraint if exists designers_discovery_status_check;
alter table public.designers
  add constraint designers_discovery_status_check
    check (discovery_status in ('pending', 'in_progress', 'complete', 'error'));

update public.designers as designer
set radio_priority = seed.priority
from (values
  ('louis-vuitton', 1000),
  ('chanel', 990),
  ('prada', 980),
  ('christian-dior', 970),
  ('gucci', 960),
  ('saint-laurent', 950),
  ('balenciaga', 940),
  ('loewe', 930),
  ('bottega-veneta', 920),
  ('miu-miu', 910),
  ('valentino', 900),
  ('versace', 890),
  ('fendi', 880),
  ('burberry-prorsum', 870),
  ('givenchy', 860),
  ('alexander-mcqueen', 850),
  ('maison-margiela', 840),
  ('schiaparelli', 830),
  ('hermes', 820),
  ('celine', 810),
  ('jacquemus', 800),
  ('the-row', 790),
  ('rick-owens', 780),
  ('dries-van-noten', 770),
  ('alaia', 760),
  ('salvatore-ferragamo', 750),
  ('dolce-gabbana', 740),
  ('tom-ford', 730),
  ('courreges', 720),
  ('mugler', 710)
) as seed(source_id, priority)
where designer.source = 'vogue-runway'
  and designer.source_id = seed.source_id;

create index if not exists designers_daily_radio_claim_idx
  on public.designers (radio_priority desc, name)
  where status = 'active'
    and discovery_status = 'pending'
    and radio_priority is not null;

create or replace function public.claim_designer_radio_batch(
  requested_limit integer default 10,
  requested_normalized_name text default null
)
returns table (id uuid, name text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  claimed_today integer;
  available integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('designer-radio-daily'));

  update public.designers
  set discovery_status = 'error'
  where discovery_status = 'in_progress'
    and discovered_at < now() - interval '2 hours';

  select count(*) into claimed_today
  from public.designers
  where discovered_at >= day_start
    and discovered_at < day_start + interval '1 day';

  available := least(
    greatest(coalesce(requested_limit, 10), 1),
    greatest(10 - claimed_today, 0)
  );

  if available = 0 then
    return;
  end if;

  return query
  with picked as (
    select designer.id
    from public.designers as designer
    where designer.status = 'active'
      and designer.discovery_status = 'pending'
      and designer.radio_priority is not null
      and (
        requested_normalized_name is null
        or designer.normalized_name = requested_normalized_name
      )
    order by designer.radio_priority desc, designer.name
    limit available
    for update skip locked
  )
  update public.designers as designer
  set discovery_status = 'in_progress',
      discovered_at = now()
  from picked
  where designer.id = picked.id
  returning designer.id, designer.name;
end
$$;

revoke all on function public.claim_designer_radio_batch(integer, text) from public;
revoke all on function public.claim_designer_radio_batch(integer, text) from anon;
revoke all on function public.claim_designer_radio_batch(integer, text) from authenticated;
grant execute on function public.claim_designer_radio_batch(integer, text) to service_role;

create or replace function public.set_runway_song_reviewed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := case when new.status = 'pending' then null else now() end;
  end if;
  return new;
end
$$;

drop trigger if exists runway_song_candidates_reviewed_at on public.runway_song_candidates;
create trigger runway_song_candidates_reviewed_at
  before update on public.runway_song_candidates
  for each row execute function public.set_runway_song_reviewed_at();