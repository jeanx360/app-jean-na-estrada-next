-- JNE App 2.2.3 — catálogo unificado de aplicativos e produtos recomendados
-- Migration idempotente. Preserva todos os links, arquivos e metadados existentes.

begin;

create extension if not exists pgcrypto;

create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  catalog_type text not null check (catalog_type in ('application', 'product')),
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_type, slug)
);

create unique index if not exists catalog_categories_type_name_unique
  on public.catalog_categories(catalog_type, lower(name));

create index if not exists catalog_categories_public_order_idx
  on public.catalog_categories(catalog_type, is_active, sort_order, name);

drop trigger if exists catalog_categories_set_updated_at on public.catalog_categories;
create trigger catalog_categories_set_updated_at
before update on public.catalog_categories
for each row execute function public.set_updated_at();

alter table public.catalog_categories enable row level security;

grant select on public.catalog_categories to anon, authenticated;
grant insert, update, delete on public.catalog_categories to authenticated;

drop policy if exists "Public reads active catalog categories" on public.catalog_categories;
create policy "Public reads active catalog categories"
on public.catalog_categories
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins insert catalog categories" on public.catalog_categories;
create policy "Admins insert catalog categories"
on public.catalog_categories
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update catalog categories" on public.catalog_categories;
create policy "Admins update catalog categories"
on public.catalog_categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete catalog categories" on public.catalog_categories;
create policy "Admins delete catalog categories"
on public.catalog_categories
for delete
to authenticated
using (public.is_admin());

alter table public.public_contents
  add column if not exists catalog_category_id uuid references public.catalog_categories(id) on delete set null;

create index if not exists public_contents_catalog_category_idx
  on public.public_contents(content_type, catalog_category_id, is_published, sort_order);

insert into public.catalog_categories (catalog_type, name, slug, description, sort_order, is_active)
values
  ('application', 'Launchers', 'launchers', 'Telas iniciais e interfaces para centrais multimídia.', 10, true),
  ('application', 'Players de vídeo', 'players-de-video', 'Reprodutores de vídeo e centrais de mídia.', 20, true),
  ('application', 'Música e áudio', 'musica-e-audio', 'Players, streaming e ferramentas de áudio.', 30, true),
  ('application', 'Mapas e navegação', 'mapas-e-navegacao', 'Aplicativos de mapas, rotas e localização.', 40, true),
  ('application', 'Comunicação', 'comunicacao', 'Mensagens, chamadas e conectividade.', 50, true),
  ('application', 'Jogos', 'jogos', 'Jogos para uso com o veículo parado.', 60, true),
  ('application', 'Utilitários', 'utilitarios', 'Ferramentas auxiliares e manutenção do sistema.', 70, true),
  ('application', 'Personalização', 'personalizacao', 'Temas, widgets e ajustes visuais.', 80, true),
  ('application', 'Multimídia', 'multimidia', 'Aplicativos gerais para centrais multimídia.', 90, true),
  ('application', 'Outros', 'outros', 'Aplicativos ainda não classificados em outra categoria.', 900, true),
  ('product', 'Acessórios', 'acessorios', 'Acessórios automotivos e itens de uso diário.', 10, true),
  ('product', 'Energia e recarga', 'energia-e-recarga', 'Carregadores, adaptadores V2L e itens de recarga.', 20, true),
  ('product', 'Multimídia', 'multimidia', 'Boxes, dongles e acessórios para entretenimento.', 30, true),
  ('product', 'Cabos e adaptadores', 'cabos-e-adaptadores', 'Cabos, conectores e adaptadores automotivos.', 40, true),
  ('product', 'Limpeza e cuidados', 'limpeza-e-cuidados', 'Produtos para conservação e estética do veículo.', 50, true),
  ('product', 'Ferramentas', 'ferramentas', 'Ferramentas e equipamentos de apoio.', 60, true),
  ('product', 'Segurança', 'seguranca', 'Câmeras, proteção e itens de segurança.', 70, true),
  ('product', 'Viagem', 'viagem', 'Organização, conforto e acessórios para estrada.', 80, true),
  ('product', 'Pneus', 'pneus', 'Pneus e itens relacionados às rodas.', 90, true),
  ('product', 'Outros', 'outros', 'Produtos ainda não classificados em outra categoria.', 900, true)
on conflict (catalog_type, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

-- Importa categorias manuais existentes sem alterar o texto, o link ou os metadados do item.
insert into public.catalog_categories (catalog_type, name, slug, description, sort_order, is_active)
select
  source.content_type,
  source.category,
  'importado-' || substr(md5(source.content_type || ':' || lower(source.category)), 1, 16),
  'Categoria importada automaticamente dos cadastros existentes.',
  500,
  true
from (
  select distinct content_type, trim(category) as category
  from public.public_contents
  where content_type in ('application', 'product')
    and nullif(trim(category), '') is not null
) as source
where not exists (
  select 1
  from public.catalog_categories category
  where category.catalog_type = source.content_type
    and lower(category.name) = lower(source.category)
);

update public.public_contents content
set catalog_category_id = category.id
from public.catalog_categories category
where content.content_type in ('application', 'product')
  and content.catalog_category_id is null
  and category.catalog_type = content.content_type
  and lower(category.name) = lower(trim(content.category));

update public.public_contents content
set
  catalog_category_id = category.id,
  category = coalesce(nullif(trim(content.category), ''), category.name)
from public.catalog_categories category
where content.content_type in ('application', 'product')
  and content.catalog_category_id is null
  and category.catalog_type = content.content_type
  and category.slug = 'outros';

-- Os atalhos antigos continuam existindo, mas passam a abrir o catálogo unificado na aba correta.
update public.home_quick_access_items
set href = '/catalogo?tipo=aplicativos'
where href = '/aplicativos';

update public.home_quick_access_items
set href = '/catalogo?tipo=produtos'
where href = '/produtos';

commit;
