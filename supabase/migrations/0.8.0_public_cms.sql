-- JNE App 0.8.0 — gestão de conteúdo público
-- Execute uma única vez depois das migrações 0.6.0 e 0.7.0.

create extension if not exists pgcrypto;

create table if not exists public.public_contents (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('tutorial', 'application', 'partner', 'product')),
  title text not null,
  slug text not null unique,
  summary text,
  category text,
  image_url text,
  image_path text,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_contents_type_idx
  on public.public_contents(content_type, is_published, sort_order, published_at desc);

create index if not exists public_contents_featured_idx
  on public.public_contents(is_featured, is_published, sort_order);

drop trigger if exists public_contents_set_updated_at on public.public_contents;
create trigger public_contents_set_updated_at
before update on public.public_contents
for each row execute function public.set_updated_at();

alter table public.public_contents enable row level security;

grant select on public.public_contents to anon, authenticated;
grant insert, update, delete on public.public_contents to authenticated;

drop policy if exists "Public reads published contents" on public.public_contents;
create policy "Public reads published contents"
on public.public_contents
for select
to anon, authenticated
using (is_published = true and coalesce(published_at, now()) <= now());

drop policy if exists "Admins read all public contents" on public.public_contents;
create policy "Admins read all public contents"
on public.public_contents
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins insert public contents" on public.public_contents;
create policy "Admins insert public contents"
on public.public_contents
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins update public contents" on public.public_contents;
create policy "Admins update public contents"
on public.public_contents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete public contents" on public.public_contents;
create policy "Admins delete public contents"
on public.public_contents
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets',
  'public-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads public assets" on storage.objects;
create policy "Public reads public assets"
on storage.objects
for select
to public
using (bucket_id = 'public-assets');

drop policy if exists "Admins upload public assets" on storage.objects;
create policy "Admins upload public assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "Admins update public assets" on storage.objects;
create policy "Admins update public assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'public-assets' and public.is_admin())
with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "Admins delete public assets" on storage.objects;
create policy "Admins delete public assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'public-assets' and public.is_admin());

-- Conteúdo inicial migrado da versão estática. O ON CONFLICT evita duplicação.
insert into public.public_contents (
  content_type, title, slug, summary, category, external_url, metadata,
  is_published, is_featured, sort_order, published_at
)
values
(
  'tutorial',
  'Geely EX2 — desbloqueio completo',
  'desbloqueio-geely-ex2',
  'Vídeo, manual em PDF e pasta com os arquivos de apoio reunidos em um único lugar.',
  'Geely EX2',
  null,
  '{
    "vehicle":"Geely EX2",
    "level":"Intermediário",
    "status":"Disponível",
    "resources":[
      {"label":"Assistir ao tutorial","description":"Passo a passo completo publicado no YouTube.","href":"https://www.youtube.com/watch?v=T-77g9hn5LU","kind":"video"},
      {"label":"Abrir o guia em PDF","description":"Manual de apoio para acompanhar o procedimento.","href":"https://github.com/jeanx360/app-jean-estrada/raw/refs/heads/main/arquivos/guia-desbloqueio-geely-ex2.pdf","kind":"pdf"},
      {"label":"Acessar os arquivos","description":"Pasta no Google Drive com aplicativos e materiais relacionados.","href":"https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link","kind":"drive"}
    ]
  }'::jsonb,
  true, true, 10, now()
),
(
  'application',
  'Netflix',
  'netflix-geely-ex2',
  'Arquivo disponibilizado como apoio para instalação em centrais multimídia compatíveis.',
  'Multimídia',
  'https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link',
  '{"compatibility":"Pasta de apoio do Geely EX2","status":"Disponível no Drive","origin":"Pasta de arquivos do Jean na Estrada"}'::jsonb,
  true, true, 10, now()
),
(
  'application',
  'GPack',
  'gpack-geely-ex2',
  'Pacote disponibilizado junto aos materiais do tutorial de desbloqueio da multimídia.',
  'Multimídia',
  'https://drive.google.com/drive/folders/1RPzQlNtSc0YC_rpFQf_IIgdB6WvejiLI?usp=drive_link',
  '{"compatibility":"Pasta de apoio do Geely EX2","status":"Disponível no Drive","origin":"Pasta de arquivos do Jean na Estrada"}'::jsonb,
  true, false, 20, now()
),
(
  'partner',
  'E-VOLK Eletropostos',
  'e-volk-eletropostos',
  'Estrutura de recarga rápida e serviços para motoristas de veículos elétricos em Porto Alegre.',
  'Recarga',
  'https://www.evolkeletropostos.com.br/',
  '{"actionLabel":"Conhecer a E-VOLK","services":["Recarga rápida","Recarga AC","Atendimento 24 horas"]}'::jsonb,
  true, true, 10, now()
),
(
  'partner',
  'Xtreme Motor Sports',
  'xtreme-motor-sports',
  'Oficina especializada em veículos elétricos, híbridos e a combustão em Cachoeirinha.',
  'Oficina',
  'https://wa.me/555134713293',
  '{"actionLabel":"Falar pelo WhatsApp","services":["Diagnóstico eletrônico","Manutenção","Freios e suspensão"]}'::jsonb,
  true, true, 20, now()
),
(
  'partner',
  'Dudyscar Pintura Automotiva',
  'dudyscar-pintura-automotiva',
  'Pintura, retoques, recuperação de para-choques e cuidados estéticos em Canoas.',
  'Estética automotiva',
  'https://wa.me/555198303983',
  '{"actionLabel":"Falar pelo WhatsApp","services":["Pintura automotiva","Retoques","Polimento e cristalização"]}'::jsonb,
  true, false, 30, now()
)
on conflict (slug) do nothing;

update public.public_contents
set image_url = case slug
  when 'e-volk-eletropostos' then '/partners/banner-evolk.webp'
  when 'xtreme-motor-sports' then '/partners/banner-xtreme.webp'
  when 'dudyscar-pintura-automotiva' then '/partners/banner-dudyscar.webp'
  else image_url
end
where slug in ('e-volk-eletropostos', 'xtreme-motor-sports', 'dudyscar-pintura-automotiva')
  and image_url is null;

insert into public.public_contents (
  content_type, title, slug, summary, category, external_url, metadata,
  is_published, is_featured, sort_order, published_at
)
values
('product','Tapete para BYD Dolphin','tapete-byd-dolphin','Jogo de tapetes para as versões do Dolphin, com peça traseira inteiriça.','Acessórios','https://s.shopee.com.br/60QGhL6SzG?share_channel_code=1','{"retailer":"Shopee","highlight":"Selecionado para o Dolphin","affiliate":true}'::jsonb,true,true,10,now()),
('product','Adaptador V2L 16A','adaptador-v2l-16a','Adaptador com botão liga/desliga para veículos elétricos compatíveis com V2L.','Energia e recarga','https://s.shopee.com.br/7VF4U8v0Vd?share_channel_code=1','{"retailer":"Shopee","highlight":"Uso automotivo","affiliate":true}'::jsonb,true,true,20,now()),
('product','Streaming Box Carlinkit','streaming-box-carlinkit','Solução Android para centrais com CarPlay ou Android Auto compatível.','Multimídia','https://meli.la/1CG7XUY','{"retailer":"Mercado Livre","affiliate":true}'::jsonb,true,false,30,now()),
('product','Adaptador CarPlay e Android Auto sem fio','adaptador-carplay-android-auto-sem-fio','Alternativa para transformar uma conexão compatível por cabo em conexão sem fio.','Multimídia','https://meli.la/1jRbS9B','{"retailer":"Mercado Livre","affiliate":true}'::jsonb,true,false,40,now()),
('product','Câmera veicular 1080p','camera-veicular-1080p','Câmera compacta para registro do trânsito e apoio durante viagens.','Segurança','https://www.amazon.com/dp/B06bUJWik','{"retailer":"Amazon","affiliate":true}'::jsonb,true,false,50,now()),
('product','Azdome M550 Pro — 3 canais','azdome-m550-pro-3-canais','Conjunto de câmeras para gravação frontal, interna e traseira.','Segurança','https://www.amazon.com/dp/B0areF0CL','{"retailer":"Amazon","affiliate":true}'::jsonb,true,false,60,now()),
('product','Pneu Pirelli 215/50R17','pneu-pirelli-215-50r17','Opção de medida usada em projetos e configurações compatíveis com o Dolphin Plus.','Pneus','https://meli.la/33xa5QL','{"retailer":"Mercado Livre","affiliate":true}'::jsonb,true,false,70,now()),
('product','Pneu Pirelli 195/60R16','pneu-pirelli-195-60r16','Opção de medida para configurações compatíveis com o BYD Dolphin GS.','Pneus','https://meli.la/2oVRfCq','{"retailer":"Mercado Livre","affiliate":true}'::jsonb,true,false,80,now())
on conflict (slug) do nothing;
