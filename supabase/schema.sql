-- Period tracker database. Run in Supabase → SQL Editor → New query → Run.
-- Safe to run again later: it never deletes data from this version.
--
-- Model: every user can sign up. A "couple" holds one person's cycle data ("tracked")
-- and at most one "partner". The two connect with a one-time invite code.
-- Row-level security makes every couple's data invisible to everyone else.

---------------------------------------------------------------------------
-- Clean up the first (single-couple) version if it exists.
---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'periods')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'periods' and column_name = 'couple_id') then
    drop table public.periods cascade;
  end if;
end $$;
drop table if exists public.members cascade;
drop function if exists public.is_member();

---------------------------------------------------------------------------
-- Tables
---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default ''
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade, -- one couple per person
  role text not null check (role in ('tracked', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (couple_id, role) -- so at most one tracked person and one partner
);

---------------------------------------------------------------------------
-- Helpers (security definer so policies can look up membership without recursion)
---------------------------------------------------------------------------
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select couple_id from public.couple_members where user_id = auth.uid();
$$;

create or replace function public.shares_couple_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.couple_members
    where user_id = other and couple_id = public.my_couple_id()
  );
$$;

create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  start_date date not null,
  end_date date,
  notes text,
  -- Kept as null if the person who logged it later deletes their account.
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date >= start_date),
  constraint periods_start_date_key unique (couple_id, start_date)
);

create index if not exists periods_couple_start_idx on public.periods (couple_id, start_date desc);

-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L): ~1 trillion combinations.
create or replace function public.generate_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid());
  code text := '';
  i int;
begin
  -- Only the bytes of a v4 UUID that are fully random.
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    code := code || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists periods_touch_updated_at on public.periods;
create trigger periods_touch_updated_at
  before update on public.periods
  for each row execute function public.touch_updated_at();

-- Create a profile for every new account, using the name given at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for accounts created before this script ran.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

---------------------------------------------------------------------------
-- Actions the app calls. All membership changes go through these, never direct writes.
---------------------------------------------------------------------------
create or replace function public.create_couple(i_am_tracked boolean)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
  code text := public.generate_invite_code();
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'You are already connected to a partner';
  end if;

  insert into public.couples (invite_code, invite_expires_at)
  values (code, now() + interval '7 days')
  returning id into new_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (new_id, auth.uid(), case when i_am_tracked then 'tracked' else 'partner' end);

  return code;
end;
$$;

create or replace function public.join_couple(code text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target public.couples;
  member_count int;
  existing_role text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'You are already connected to a partner';
  end if;

  select * into target
  from public.couples
  where invite_code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'))
    and invite_expires_at > now()
  for update;

  if not found then
    raise exception 'That invite code is wrong or has expired';
  end if;

  select count(*), min(role) into member_count, existing_role
  from public.couple_members where couple_id = target.id;

  if member_count >= 2 then
    raise exception 'That couple is already full';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (target.id, auth.uid(), case when existing_role = 'tracked' then 'partner' else 'tracked' end);

  -- Codes are single use.
  update public.couples set invite_code = null, invite_expires_at = null where id = target.id;
end;
$$;

create or replace function public.new_invite_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  cid uuid := public.my_couple_id();
  code text := public.generate_invite_code();
begin
  if cid is null then
    raise exception 'You are not in a couple';
  end if;
  if (select count(*) from public.couple_members where couple_id = cid) >= 2 then
    raise exception 'You are already connected to a partner';
  end if;
  update public.couples
  set invite_code = code, invite_expires_at = now() + interval '7 days'
  where id = cid;
  return code;
end;
$$;

-- The tracked person can disconnect their partner at any time. The data stays with them.
create or replace function public.remove_partner()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  cid uuid := public.my_couple_id();
begin
  if not exists (select 1 from public.couple_members where user_id = auth.uid() and role = 'tracked') then
    raise exception 'Only the person whose cycle is tracked can remove a partner';
  end if;
  delete from public.couple_members where couple_id = cid and role = 'partner';
end;
$$;

-- A partner leaving keeps the data for the tracked person.
-- The tracked person leaving deletes the couple and all of its cycle data (see trigger below).
create or replace function public.leave_couple()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.couple_members where user_id = auth.uid();
end;
$$;

-- Whenever someone leaves for any reason (including deleting their account):
-- if it was the tracked person, or nobody is left, the couple and its data are deleted.
create or replace function public.cleanup_couple()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'tracked'
     or not exists (select 1 from public.couple_members where couple_id = old.couple_id) then
    delete from public.couples where id = old.couple_id;
  end if;
  return null;
end;
$$;

drop trigger if exists couple_members_cleanup on public.couple_members;
create trigger couple_members_cleanup
  after delete on public.couple_members
  for each row execute function public.cleanup_couple();

---------------------------------------------------------------------------
-- Row-level security
---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.periods enable row level security;

drop policy if exists "read own and partner profile" on public.profiles;
create policy "read own and partner profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_couple_with(id));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read own couple" on public.couples;
create policy "read own couple" on public.couples
  for select to authenticated using (id = public.my_couple_id());

drop policy if exists "read own couple members" on public.couple_members;
create policy "read own couple members" on public.couple_members
  for select to authenticated using (couple_id = public.my_couple_id());

drop policy if exists "couple reads periods" on public.periods;
create policy "couple reads periods" on public.periods
  for select to authenticated using (couple_id = public.my_couple_id());

drop policy if exists "couple adds periods" on public.periods;
create policy "couple adds periods" on public.periods
  for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());

drop policy if exists "couple edits periods" on public.periods;
create policy "couple edits periods" on public.periods
  for update to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

drop policy if exists "couple deletes periods" on public.periods;
create policy "couple deletes periods" on public.periods
  for delete to authenticated using (couple_id = public.my_couple_id());

---------------------------------------------------------------------------
-- Permissions: signed-in users only, and only through the policies above.
---------------------------------------------------------------------------
revoke all on public.profiles, public.couples, public.couple_members, public.periods from anon;
revoke insert, update, delete on public.couples, public.couple_members from authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.couples, public.couple_members to authenticated;
grant select, insert, update, delete on public.periods to authenticated;

revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.cleanup_couple() from public, anon, authenticated;
revoke execute on function public.create_couple(boolean), public.join_couple(text), public.new_invite_code(),
  public.remove_partner(), public.leave_couple(), public.my_couple_id(), public.shares_couple_with(uuid)
  from public, anon;
grant execute on function public.create_couple(boolean), public.join_couple(text), public.new_invite_code(),
  public.remove_partner(), public.leave_couple(), public.my_couple_id(), public.shares_couple_with(uuid)
  to authenticated;

---------------------------------------------------------------------------
-- Live updates between the two phones.
---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.periods;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.couple_members;
exception when duplicate_object then null;
end $$;
