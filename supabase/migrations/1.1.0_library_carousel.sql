-- JNE App 1.1.0 — biblioteca de veículos, arquivos de aplicativos e carrossel da home
-- Execute depois da migração 1.0.0.

create extension if not exists pgcrypto;

-- =========================================================
-- Biblioteca de veículos e manuais
-- =========================================================
create table if not exists public.vehicle_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  sort_order integer not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.vehicle_brands(id) on delete cascade,
  name text not null,
  slug text not null,
  image_url text,
  image_path text,
  sort_order integer not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  title text not null,
  document_type text not null check (document_type in ('owner','maintenance','warranty','multimedia','quick-guide','technical','other')),
  description text,
  years integer[] not null default '{}'::integer[],
  source_type text not null check (source_type in ('upload','external')),
  external_url text,
  file_path text,
  file_name text,
  file_size bigint,
  language text not null default 'Português',
  source_name text,
  access_level text not null default 'public' check (access_level in ('public','vip')),
  is_published boolean not null default false,
  sort_order integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_documents_source_check check (
    (source_type = 'external' and external_url is not null and file_path is null)
    or (source_type = 'upload' and file_path is not null and external_url is null)
  )
);

create index if not exists vehicle_brands_public_idx on public.vehicle_brands(is_published, sort_order, name);
create index if not exists vehicle_models_brand_idx on public.vehicle_models(brand_id, is_published, sort_order, name);
create index if not exists vehicle_documents_model_idx on public.vehicle_documents(model_id, is_published, sort_order, published_at desc);
create index if not exists vehicle_documents_years_idx on public.vehicle_documents using gin(years);


drop trigger if exists vehicle_brands_set_updated_at on public.vehicle_brands;
create trigger vehicle_brands_set_updated_at before update on public.vehicle_brands
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_models_set_updated_at on public.vehicle_models;
create trigger vehicle_models_set_updated_at before update on public.vehicle_models
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_documents_set_updated_at on public.vehicle_documents;
create trigger vehicle_documents_set_updated_at before update on public.vehicle_documents
for each row execute function public.set_updated_at();

alter table public.vehicle_brands enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_documents enable row level security;

grant select on public.vehicle_brands, public.vehicle_models, public.vehicle_documents to anon, authenticated;
grant insert, update, delete on public.vehicle_brands, public.vehicle_models, public.vehicle_documents to authenticated;

drop policy if exists "Public reads published vehicle brands" on public.vehicle_brands;
create policy "Public reads published vehicle brands" on public.vehicle_brands for select to anon, authenticated
using (is_published = true);
drop policy if exists "Admins read all vehicle brands" on public.vehicle_brands;
create policy "Admins read all vehicle brands" on public.vehicle_brands for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert vehicle brands" on public.vehicle_brands;
create policy "Admins insert vehicle brands" on public.vehicle_brands for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update vehicle brands" on public.vehicle_brands;
create policy "Admins update vehicle brands" on public.vehicle_brands for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete vehicle brands" on public.vehicle_brands;
create policy "Admins delete vehicle brands" on public.vehicle_brands for delete to authenticated using (public.is_admin());

drop policy if exists "Public reads published vehicle models" on public.vehicle_models;
create policy "Public reads published vehicle models" on public.vehicle_models for select to anon, authenticated
using (is_published = true and exists (select 1 from public.vehicle_brands b where b.id = vehicle_models.brand_id and b.is_published = true));
drop policy if exists "Admins read all vehicle models" on public.vehicle_models;
create policy "Admins read all vehicle models" on public.vehicle_models for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert vehicle models" on public.vehicle_models;
create policy "Admins insert vehicle models" on public.vehicle_models for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update vehicle models" on public.vehicle_models;
create policy "Admins update vehicle models" on public.vehicle_models for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete vehicle models" on public.vehicle_models;
create policy "Admins delete vehicle models" on public.vehicle_models for delete to authenticated using (public.is_admin());

drop policy if exists "Public reads published vehicle documents" on public.vehicle_documents;
create policy "Public reads published vehicle documents" on public.vehicle_documents for select to anon, authenticated
using (
  is_published = true
  and coalesce(published_at, now()) <= now()
  and exists (
    select 1 from public.vehicle_models m
    join public.vehicle_brands b on b.id = m.brand_id
    where m.id = vehicle_documents.model_id and m.is_published = true and b.is_published = true
  )
);
drop policy if exists "Admins read all vehicle documents" on public.vehicle_documents;
create policy "Admins read all vehicle documents" on public.vehicle_documents for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert vehicle documents" on public.vehicle_documents;
create policy "Admins insert vehicle documents" on public.vehicle_documents for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update vehicle documents" on public.vehicle_documents;
create policy "Admins update vehicle documents" on public.vehicle_documents for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete vehicle documents" on public.vehicle_documents;
create policy "Admins delete vehicle documents" on public.vehicle_documents for delete to authenticated using (public.is_admin());

-- Bucket privado de manuais.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-documents', 'vehicle-documents', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists "Admins read vehicle documents storage" on storage.objects;
create policy "Admins read vehicle documents storage" on storage.objects for select to authenticated
using (bucket_id = 'vehicle-documents' and public.is_admin());
drop policy if exists "Admins upload vehicle documents storage" on storage.objects;
create policy "Admins upload vehicle documents storage" on storage.objects for insert to authenticated
with check (bucket_id = 'vehicle-documents' and public.is_admin());
drop policy if exists "Admins update vehicle documents storage" on storage.objects;
create policy "Admins update vehicle documents storage" on storage.objects for update to authenticated
using (bucket_id = 'vehicle-documents' and public.is_admin()) with check (bucket_id = 'vehicle-documents' and public.is_admin());
drop policy if exists "Admins delete vehicle documents storage" on storage.objects;
create policy "Admins delete vehicle documents storage" on storage.objects for delete to authenticated
using (bucket_id = 'vehicle-documents' and public.is_admin());

-- Bucket privado de APKs e pacotes de instalação.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-files', 'app-files', false, 104857600, null)
on conflict (id) do update set public = false, file_size_limit = 104857600, allowed_mime_types = null;

drop policy if exists "Admins read app files" on storage.objects;
create policy "Admins read app files" on storage.objects for select to authenticated
using (bucket_id = 'app-files' and public.is_admin());
drop policy if exists "Admins upload app files" on storage.objects;
create policy "Admins upload app files" on storage.objects for insert to authenticated
with check (bucket_id = 'app-files' and public.is_admin());
drop policy if exists "Admins update app files" on storage.objects;
create policy "Admins update app files" on storage.objects for update to authenticated
using (bucket_id = 'app-files' and public.is_admin()) with check (bucket_id = 'app-files' and public.is_admin());
drop policy if exists "Admins delete app files" on storage.objects;
create policy "Admins delete app files" on storage.objects for delete to authenticated
using (bucket_id = 'app-files' and public.is_admin());

-- Marcas iniciais para facilitar o primeiro cadastro. Não cria documentos fictícios.
insert into public.vehicle_brands (name, slug, sort_order, is_published)
values ('BYD', 'byd', 10, true), ('Geely', 'geely', 20, true), ('GWM', 'gwm', 30, true)
on conflict (slug) do nothing;

insert into public.vehicle_models (brand_id, name, slug, sort_order, is_published)
select b.id, seed.name, seed.slug, seed.sort_order, true
from (values
  ('byd', 'Dolphin', 'dolphin', 10),
  ('geely', 'EX2', 'ex2', 10),
  ('gwm', 'Ora 03', 'ora-03', 10)
) as seed(brand_slug, name, slug, sort_order)
join public.vehicle_brands b on b.slug = seed.brand_slug
on conflict (brand_id, slug) do nothing;

-- =========================================================
-- Carrossel administrável da página inicial
-- =========================================================
create table if not exists public.home_carousel_slides (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('custom','latest_video','latest_news','public_content')),
  public_content_id uuid references public.public_contents(id) on delete set null,
  badge text,
  title text,
  description text,
  action_label text,
  action_url text,
  image_url text,
  image_path text,
  sort_order integer not null default 100,
  is_published boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_carousel_content_check check (
    (source_type = 'public_content' and public_content_id is not null)
    or (source_type <> 'public_content')
  ),
  constraint home_carousel_dates_check check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists home_carousel_public_idx on public.home_carousel_slides(is_published, sort_order, starts_at, ends_at);

drop trigger if exists home_carousel_set_updated_at on public.home_carousel_slides;
create trigger home_carousel_set_updated_at before update on public.home_carousel_slides
for each row execute function public.set_updated_at();

alter table public.home_carousel_slides enable row level security;
grant select on public.home_carousel_slides to anon, authenticated;
grant insert, update, delete on public.home_carousel_slides to authenticated;

drop policy if exists "Public reads active home slides" on public.home_carousel_slides;
create policy "Public reads active home slides" on public.home_carousel_slides for select to anon, authenticated
using (
  is_published = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and (
    source_type <> 'public_content'
    or exists (
      select 1 from public.public_contents pc
      where pc.id = home_carousel_slides.public_content_id
        and pc.is_published = true
        and coalesce(pc.published_at, now()) <= now()
    )
  )
);
drop policy if exists "Admins read all home slides" on public.home_carousel_slides;
create policy "Admins read all home slides" on public.home_carousel_slides for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert home slides" on public.home_carousel_slides;
create policy "Admins insert home slides" on public.home_carousel_slides for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update home slides" on public.home_carousel_slides;
create policy "Admins update home slides" on public.home_carousel_slides for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete home slides" on public.home_carousel_slides;
create policy "Admins delete home slides" on public.home_carousel_slides for delete to authenticated using (public.is_admin());

insert into public.home_carousel_slides (source_type, badge, title, description, action_label, action_url, sort_order, is_published)
select 'custom', 'JNE APP', 'O universo do Jean na Estrada em um só lugar.',
       'Vídeos, tutoriais, manuais, aplicativos automotivos, parceiros e benefícios organizados em uma plataforma preparada para crescer.',
       'Explorar o aplicativo', '/guia', 10, true
where not exists (select 1 from public.home_carousel_slides where source_type = 'custom' and title = 'O universo do Jean na Estrada em um só lugar.');

insert into public.home_carousel_slides (source_type, badge, title, description, action_label, action_url, sort_order, is_published)
select 'latest_video', 'ÚLTIMO VÍDEO', null, null, null, null, 20, true
where not exists (select 1 from public.home_carousel_slides where source_type = 'latest_video');

insert into public.home_carousel_slides (source_type, badge, title, description, action_label, action_url, sort_order, is_published)
select 'latest_news', 'NOTÍCIA EM DESTAQUE', null, null, null, null, 30, true
where not exists (select 1 from public.home_carousel_slides where source_type = 'latest_news');

insert into public.home_carousel_slides (source_type, public_content_id, badge, sort_order, is_published)
select 'public_content', pc.id, 'PARCEIRO JNE', 40, true
from public.public_contents pc
where pc.content_type = 'partner' and pc.slug = 'e-volk-eletropostos'
  and not exists (select 1 from public.home_carousel_slides h where h.source_type = 'public_content' and h.public_content_id = pc.id);

-- Auditoria das novas estruturas, quando a função da versão 1.0 já estiver disponível.
do $$
begin
  if to_regprocedure('public.capture_admin_audit()') is not null then
    execute 'drop trigger if exists audit_vehicle_brands on public.vehicle_brands';
    execute 'create trigger audit_vehicle_brands after insert or update or delete on public.vehicle_brands for each row execute function public.capture_admin_audit()';
    execute 'drop trigger if exists audit_vehicle_models on public.vehicle_models';
    execute 'create trigger audit_vehicle_models after insert or update or delete on public.vehicle_models for each row execute function public.capture_admin_audit()';
    execute 'drop trigger if exists audit_vehicle_documents on public.vehicle_documents';
    execute 'create trigger audit_vehicle_documents after insert or update or delete on public.vehicle_documents for each row execute function public.capture_admin_audit()';
    execute 'drop trigger if exists audit_home_carousel_slides on public.home_carousel_slides';
    execute 'create trigger audit_home_carousel_slides after insert or update or delete on public.home_carousel_slides for each row execute function public.capture_admin_audit()';
  end if;
end $$;
