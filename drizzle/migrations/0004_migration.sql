do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'app_role' and n.nspname = 'public') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy if exists "Own profile read" on public.profiles;
drop policy if exists "Own profile insert" on public.profiles;
drop policy if exists "Own profile update" on public.profiles;
create policy "Own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
drop policy if exists "Own roles read" on public.user_roles;
create policy "Own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.styling_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  author_display_name text not null,
  title text not null,
  styling_idea text not null,
  tags text[] not null default '{}',
  song_artist text not null,
  song_track text not null,
  song_reason text not null,
  photo_paths text[] not null default '{}',
  photo_alts text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.styling_notes to authenticated;
grant all on public.styling_notes to service_role;
alter table public.styling_notes enable row level security;
drop policy if exists "Owners read own notes" on public.styling_notes;
drop policy if exists "Moderators read all notes" on public.styling_notes;
drop policy if exists "Owners submit pending" on public.styling_notes;
drop policy if exists "Owners edit back to pending" on public.styling_notes;
drop policy if exists "Moderators review" on public.styling_notes;
drop policy if exists "Owners delete own" on public.styling_notes;
create policy "Owners read own notes" on public.styling_notes for select to authenticated using (auth.uid() = owner_id);
create policy "Moderators read all notes" on public.styling_notes for select to authenticated using (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));
create policy "Owners submit pending" on public.styling_notes for insert to authenticated with check (auth.uid() = owner_id and status = 'pending');
create policy "Owners edit back to pending" on public.styling_notes for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and status = 'pending');
create policy "Moderators review" on public.styling_notes for update to authenticated using (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));
create policy "Owners delete own" on public.styling_notes for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Owners upload styling photos" on storage.objects;
drop policy if exists "Owners read styling photos" on storage.objects;
drop policy if exists "Owners delete styling photos" on storage.objects;
create policy "Owners upload styling photos" on storage.objects for insert to authenticated with check (bucket_id = 'styling-notes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners read styling photos" on storage.objects for select to authenticated using (bucket_id = 'styling-notes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners delete styling photos" on storage.objects for delete to authenticated using (bucket_id = 'styling-notes' and (storage.foldername(name))[1] = auth.uid()::text);