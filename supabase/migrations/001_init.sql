-- ============================================================
-- FORGE//PC — Schéma Supabase
-- Exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. TABLE: categories
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  slug       text not null unique,
  created_at timestamptz default now()
);

-- 2. TABLE: products
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand       text not null,
  category_id uuid references public.categories(id) on delete set null,
  price       numeric(10,2) not null default 0,
  image_url   text not null default '',
  tagline     text not null default '',
  socket      text,
  chipset     text,
  ram_type    text,
  form_factor text,
  tdp         integer,
  specs       jsonb not null default '{}',
  created_at  timestamptz default now()
);

-- 3. Index pour recherche rapide par catégorie
create index if not exists products_category_id_idx on public.products(category_id);

-- 4. Storage bucket pour les photos produits
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 5. Policies de stockage (accès public en lecture, authentifié en écriture)
create policy "Public read product images"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

create policy "Anon upload product images"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' );

create policy "Anon update product images"
  on storage.objects for update
  using ( bucket_id = 'product-images' );

create policy "Anon delete product images"
  on storage.objects for delete
  using ( bucket_id = 'product-images' );

-- 6. RLS: accès public en lecture, pas de restriction en écriture (admin simple)
alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy "Public read categories"
  on public.categories for select using (true);

create policy "Public write categories"
  on public.categories for all using (true) with check (true);

create policy "Public read products"
  on public.products for select using (true);

create policy "Public write products"
  on public.products for all using (true) with check (true);

-- 7. Données initiales — catégories
insert into public.categories (label, slug) values
  ('Processeurs', 'cpu'),
  ('Cartes mères', 'motherboard'),
  ('Cartes graphiques', 'gpu'),
  ('Mémoire RAM', 'ram'),
  ('Stockage', 'storage'),
  ('Alimentations', 'psu'),
  ('Boîtiers', 'case'),
  ('Refroidissement', 'cooler'),
  ('Périphériques', 'peripheral')
on conflict (slug) do nothing;
