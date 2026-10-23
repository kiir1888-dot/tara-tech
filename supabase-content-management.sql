-- Run after supabase-schema.sql in the Supabase SQL editor.
-- Adds editable portfolio gallery and hero slides and seeds existing site content.

create table if not exists public.gallery_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  category text not null check (char_length(category) between 2 and 160),
  image_url text not null,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  alt_text text not null check (char_length(alt_text) between 2 and 240),
  image_url text not null,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create index if not exists gallery_projects_order_index_idx
  on public.gallery_projects (order_index, created_at);
create index if not exists hero_slides_order_index_idx
  on public.hero_slides (order_index, created_at);

alter table public.gallery_projects enable row level security;
alter table public.hero_slides enable row level security;

drop policy if exists "Gallery projects are publicly readable" on public.gallery_projects;
create policy "Gallery projects are publicly readable"
  on public.gallery_projects for select to anon, authenticated using (true);
drop policy if exists "Admins can create gallery projects" on public.gallery_projects;
create policy "Admins can create gallery projects"
  on public.gallery_projects for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update gallery projects" on public.gallery_projects;
create policy "Admins can update gallery projects"
  on public.gallery_projects for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete gallery projects" on public.gallery_projects;
create policy "Admins can delete gallery projects"
  on public.gallery_projects for delete to authenticated using (public.is_admin());

drop policy if exists "Hero slides are publicly readable" on public.hero_slides;
create policy "Hero slides are publicly readable"
  on public.hero_slides for select to anon, authenticated using (true);
drop policy if exists "Admins can create hero slides" on public.hero_slides;
create policy "Admins can create hero slides"
  on public.hero_slides for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update hero slides" on public.hero_slides;
create policy "Admins can update hero slides"
  on public.hero_slides for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete hero slides" on public.hero_slides;
create policy "Admins can delete hero slides"
  on public.hero_slides for delete to authenticated using (public.is_admin());

grant select on public.gallery_projects, public.hero_slides, public.team to anon, authenticated;
grant insert, update, delete on public.gallery_projects, public.hero_slides, public.team to authenticated;

insert into public.gallery_projects (id, title, category, image_url, order_index)
values
  ('50100000-0000-4000-8000-000000000001', 'FinTrack Dashboard', 'React + Node.js Platform', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85', 0),
  ('50100000-0000-4000-8000-000000000002', 'Tara Interiors', 'CMS + Business Website', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85', 1),
  ('50100000-0000-4000-8000-000000000003', 'MoveFit App', 'Mobile App + REST API', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=85', 2),
  ('50100000-0000-4000-8000-000000000004', 'Tara Commerce', 'E-Commerce + Payments', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85', 3)
on conflict (id) do nothing;

insert into public.hero_slides (id, alt_text, image_url, order_index)
values
  ('50200000-0000-4000-8000-000000000001', 'Full-stack development workspace at Tara Tech', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=88', 0),
  ('50200000-0000-4000-8000-000000000002', 'Application code developed by Tara Tech', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=88', 1),
  ('50200000-0000-4000-8000-000000000003', 'Business analytics dashboard built for digital growth', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=88', 2)
on conflict (id) do nothing;

insert into public.team (name, role, bio, image_url, order_index)
select defaults.name, defaults.role, defaults.bio, defaults.image_url, defaults.order_index
from (values
  ('Kiir David', 'Founder & Principal Strategist', 'Strategy That Drives Growth', 'Team/Kiir%20David.jpeg', 0),
  ('John Marit', 'Full-Stack Developer', 'Products Built to Scale', 'Team/John%20Marit.jpeg', 1),
  ('Ateng Aguto', 'Full-Stack Developer', 'Complete Products, End to End', 'Team/Ateng%20Aguto.jpeg', 2),
  ('Deng Marop', 'Full-Stack Developer', 'Complete Products, End to End', 'Team/Deng%20Marop.jpeg', 3),
  ('Reeng Kuol', 'Full-Stack Developer', 'Complete Products, End to End', 'Team/Reeng%20Kuol.jpeg', 4),
  ('Igam Mayor', 'Frontend Developer', 'Interfaces People Enjoy', 'Team/Igam%20Mayor.jpeg', 5),
  ('Kachuol Deng', 'Frontend Developer', 'Interfaces People Enjoy', 'Team/Kachuol%20Deng.jpeg', 6),
  ('Achol Thon', 'Frontend Developer', 'Interfaces People Enjoy', 'Team/Achol%20Thon.jpeg', 7),
  ('Samuel Kuol', 'Social Media & Content Marketer', 'Stories That Build Brands', 'Team/Samuel%20Kuol.jpeg', 8),
  ('Akuany Manyok', 'Frontend Developer', 'Interfaces People Enjoy', 'Team/Akuany%20Manyok.jpeg', 9)
) as defaults(name, role, bio, image_url, order_index)
where not exists (
  select 1 from public.team existing where lower(existing.name) = lower(defaults.name)
);
