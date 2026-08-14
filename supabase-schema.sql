-- Run this file in the Supabase SQL editor.
-- It creates the application tables, RLS policies, and website-assets bucket.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin'))
);


create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  content text not null check (char_length(content) between 1 and 20000),
  category text not null default 'Tech' check (category in ('Tech', 'Sports')),
  image_url text,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
    description text not null check (char_length(description) between 1 and 10000),
  event_date timestamptz not null,
  location text not null check (char_length(location) between 1 and 500),
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.team (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  role text not null check (char_length(role) between 2 and 120),
  bio text not null default '',
  image_url text,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  phone text,
  message text not null check (char_length(message) between 5 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists news_created_at_idx on public.news (created_at desc);
create index if not exists news_views_idx on public.news (views desc);
create index if not exists events_event_date_idx on public.events (event_date);
create index if not exists team_order_index_idx on public.team (order_index, created_at);
create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);

create or replace function public.increment_news_views(news_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.news set views = views + 1 where id = news_id;
$$;

grant execute on function public.increment_news_views(uuid) to anon, authenticated;

drop function if exists public.get_popular_news(integer);
create or replace function public.get_popular_news(limit_count integer default 5)
returns table(
  id uuid,
  title text,
  category text,
  views integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select n.id, n.title, n.category, n.views
  from public.news n
  where n.created_at >= now() - interval '7 days'
  order by n.views desc
  limit limit_count;
$$;

grant execute on function public.get_popular_news(integer) to anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, role)
select id, 'user' from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.news enable row level security;
alter table public.events enable row level security;
alter table public.team enable row level security;
alter table public.contact_inquiries enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "News is publicly readable" on public.news;
create policy "News is publicly readable" on public.news for select to anon, authenticated using (true);
drop policy if exists "Admins can create news" on public.news;
create policy "Admins can create news" on public.news for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());
drop policy if exists "Admins can update news" on public.news;
create policy "Admins can update news" on public.news for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete news" on public.news;
create policy "Admins can delete news" on public.news for delete to authenticated using (public.is_admin());

drop policy if exists "Events are publicly readable" on public.events;
create policy "Events are publicly readable" on public.events for select to anon, authenticated using (true);
drop policy if exists "Admins can create events" on public.events;
create policy "Admins can create events" on public.events for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events" on public.events for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events" on public.events for delete to authenticated using (public.is_admin());

drop policy if exists "Team is publicly readable" on public.team;
create policy "Team is publicly readable" on public.team for select to anon, authenticated using (true);
drop policy if exists "Admins can create team members" on public.team;
create policy "Admins can create team members" on public.team for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update team members" on public.team;
create policy "Admins can update team members" on public.team for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete team members" on public.team;
create policy "Admins can delete team members" on public.team for delete to authenticated using (public.is_admin());

drop policy if exists "Anyone can submit an inquiry" on public.contact_inquiries;
create policy "Anyone can submit an inquiry" on public.contact_inquiries for insert to anon, authenticated with check (true);
drop policy if exists "Admins can read inquiries" on public.contact_inquiries;
create policy "Admins can read inquiries" on public.contact_inquiries for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('website-assets', 'website-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Website assets are publicly readable" on storage.objects;
create policy "Website assets are publicly readable" on storage.objects for select to public
using (bucket_id = 'website-assets');
drop policy if exists "Admins can upload website assets" on storage.objects;
create policy "Admins can upload website assets" on storage.objects for insert to authenticated
with check (bucket_id = 'website-assets' and public.is_admin());
drop policy if exists "Admins can update website assets" on storage.objects;
create policy "Admins can update website assets" on storage.objects for update to authenticated
using (bucket_id = 'website-assets' and public.is_admin())
with check (bucket_id = 'website-assets' and public.is_admin());
drop policy if exists "Admins can delete website assets" on storage.objects;
create policy "Admins can delete website assets" on storage.objects for delete to authenticated
using (bucket_id = 'website-assets' and public.is_admin());

-- Promote the first administrator after creating them in Authentication > Users:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
