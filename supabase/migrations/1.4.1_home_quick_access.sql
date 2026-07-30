-- JNE App 1.4.1 — atalhos administráveis da home
-- Execute depois da migração 1.4.0.

create extension if not exists pgcrypto;

create table if not exists public.home_quick_access_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 70),
  description text not null check (char_length(description) between 3 and 180),
  href text not null,
  icon text not null default 'videos' check (icon in ('videos','manuals','apps','products','calculator','vip','community','news','partners')),
  accent text not null default 'blue' check (accent in ('blue','cyan','orange','violet')),
  sort_order integer not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_quick_access_href_check check (href like '/%' or href like 'https://%')
);

create index if not exists home_quick_access_public_idx
on public.home_quick_access_items(is_published, sort_order, created_at);

drop trigger if exists home_quick_access_set_updated_at on public.home_quick_access_items;
create trigger home_quick_access_set_updated_at before update on public.home_quick_access_items
for each row execute function public.set_updated_at();

alter table public.home_quick_access_items enable row level security;
grant select on public.home_quick_access_items to anon, authenticated;
grant insert, update, delete on public.home_quick_access_items to authenticated;

drop policy if exists "Public reads visible home quick access" on public.home_quick_access_items;
create policy "Public reads visible home quick access" on public.home_quick_access_items
for select to anon, authenticated using (is_published = true);

drop policy if exists "Admins read all home quick access" on public.home_quick_access_items;
create policy "Admins read all home quick access" on public.home_quick_access_items
for select to authenticated using (public.is_admin());

drop policy if exists "Admins insert home quick access" on public.home_quick_access_items;
create policy "Admins insert home quick access" on public.home_quick_access_items
for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update home quick access" on public.home_quick_access_items;
create policy "Admins update home quick access" on public.home_quick_access_items
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete home quick access" on public.home_quick_access_items;
create policy "Admins delete home quick access" on public.home_quick_access_items
for delete to authenticated using (public.is_admin());

insert into public.home_quick_access_items (title, description, href, icon, accent, sort_order, is_published)
select seed.title, seed.description, seed.href, seed.icon, seed.accent, seed.sort_order, true
from (values
  ('Vídeos do canal', 'Análises, testes reais, lançamentos e bastidores.', '/videos', 'videos', 'blue', 10),
  ('Guia e manuais', 'Aprenda o básico e encontre documentos por veículo e ano.', '/guia', 'manuals', 'cyan', 20),
  ('Aplicativos para carros', 'Arquivos de apoio, compatibilidade e alertas de instalação.', '/aplicativos', 'apps', 'orange', 30),
  ('Produtos recomendados', 'Itens automotivos e tecnológicos selecionados para a comunidade.', '/produtos', 'products', 'violet', 40),
  ('Calculadora EV', 'Compare custos de energia, combustível e manutenção.', '/calculadora', 'calculator', 'cyan', 50),
  ('Membros VIP', 'Conteúdos, arquivos e benefícios exclusivos para membros.', '/membros', 'vip', 'orange', 60)
) as seed(title, description, href, icon, accent, sort_order)
where not exists (select 1 from public.home_quick_access_items);

do $$
begin
  if to_regprocedure('public.capture_admin_audit()') is not null then
    execute 'drop trigger if exists audit_home_quick_access_items on public.home_quick_access_items';
    execute 'create trigger audit_home_quick_access_items after insert or update or delete on public.home_quick_access_items for each row execute function public.capture_admin_audit()';
  end if;
end $$;
