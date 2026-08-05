-- JNE App 2.2.1 — editor visual administrativo da página inicial
-- Execute depois da migração 2.1.2.

create extension if not exists pgcrypto;

create table if not exists public.home_visual_blocks (
  id uuid primary key default gen_random_uuid(),
  block_key text not null unique check (block_key ~ '^[a-z0-9_-]+$'),
  block_type text not null check (block_type in ('carousel','cta','utility','quick_access','videos','trust')),
  variant text not null default 'default' check (variant in ('default','commercial','community','ev','driver')),
  eyebrow text,
  title text,
  description text,
  action_label text,
  action_url text,
  secondary_action_label text,
  secondary_action_url text,
  icon text check (icon is null or icon in ('sparkles','handshake','battery','calculator','route','check','videos','grid')),
  accent text not null default 'blue' check (accent in ('blue','cyan','orange','violet','green')),
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100 check (sort_order between 0 and 100000),
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_visual_action_url_check check (action_url is null or action_url = '' or action_url like '/%' or action_url like 'https://%'),
  constraint home_visual_secondary_url_check check (secondary_action_url is null or secondary_action_url = '' or secondary_action_url like '/%' or secondary_action_url like 'https://%')
);

create index if not exists home_visual_blocks_public_idx
on public.home_visual_blocks(is_published, sort_order, created_at);

drop trigger if exists home_visual_blocks_set_updated_at on public.home_visual_blocks;
create trigger home_visual_blocks_set_updated_at before update on public.home_visual_blocks
for each row execute function public.set_updated_at();

alter table public.home_visual_blocks enable row level security;
grant select on public.home_visual_blocks to anon, authenticated;
grant insert, update, delete on public.home_visual_blocks to authenticated;

drop policy if exists "Public reads visible home visual blocks" on public.home_visual_blocks;
create policy "Public reads visible home visual blocks" on public.home_visual_blocks
for select to anon, authenticated using (is_published = true);

drop policy if exists "Admins read all home visual blocks" on public.home_visual_blocks;
create policy "Admins read all home visual blocks" on public.home_visual_blocks
for select to authenticated using (public.is_admin());

drop policy if exists "Admins insert home visual blocks" on public.home_visual_blocks;
create policy "Admins insert home visual blocks" on public.home_visual_blocks
for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update home visual blocks" on public.home_visual_blocks;
create policy "Admins update home visual blocks" on public.home_visual_blocks
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete home visual blocks" on public.home_visual_blocks;
create policy "Admins delete home visual blocks" on public.home_visual_blocks
for delete to authenticated using (public.is_admin());

insert into public.home_visual_blocks
  (block_key, block_type, variant, eyebrow, title, description, action_label, action_url, secondary_action_label, secondary_action_url, icon, accent, sort_order, is_published)
values
  ('carousel', 'carousel', 'default', null, 'Carrossel principal', 'Destaques principais da página inicial.', null, null, null, null, 'sparkles', 'blue', 10, true),
  ('start_cta', 'cta', 'commercial', 'JNE APP 2.0', 'Escolha seu caminho e comece sem complicação.', 'Use o aplicativo para acompanhar o conteúdo, participar da comunidade ou organizar sua operação como motorista profissional.', 'Ver primeiros passos', '/comecar', 'Comparar planos', '/planos', 'check', 'blue', 20, true),
  ('utility_ev', 'utility', 'ev', 'PARA QUEM PENSA EM ELÉTRICO', 'Vale a pena ter um elétrico?', 'Compare energia, combustível e manutenção com base no seu uso.', 'Calcular economia', '/calculadora', null, null, 'battery', 'cyan', 30, true),
  ('utility_driver', 'utility', 'driver', 'PARA MOTORISTAS', 'Quanto cobrar por uma viagem?', 'Monte uma referência profissional com quilômetros, horas e despesas.', 'Montar orçamento', '/motorista/calculadora', null, null, 'calculator', 'orange', 31, true),
  ('quick_access', 'quick_access', 'default', 'ACESSO RÁPIDO', 'Encontre o que precisa sem perder tempo.', 'Conteúdo, ferramentas, manuais, parceiros e benefícios organizados em áreas próprias.', null, null, null, null, 'grid', 'blue', 40, true),
  ('videos', 'videos', 'default', 'DESTAQUES DO CANAL', 'Conteúdo que representa o projeto.', null, 'Ver todos', '/videos', null, null, 'videos', 'blue', 50, true),
  ('community_cta', 'cta', 'community', 'PLATAFORMA PRÓPRIA', 'Mais que um aplicativo: um ponto de encontro da comunidade.', 'O JNE App é a casa oficial dos conteúdos, arquivos, parceiros e benefícios exclusivos.', 'Conhecer a área VIP', '/membros', null, null, 'route', 'blue', 60, true),
  ('trust_content', 'trust', 'default', null, 'Conteúdo real', 'Experiências práticas, testes e opinião transparente.', null, null, null, null, 'sparkles', 'blue', 70, true),
  ('trust_partners', 'trust', 'default', null, 'Parceiros selecionados', 'Empresas e serviços que agregam valor à comunidade.', null, null, null, null, 'handshake', 'green', 71, true)
on conflict (block_key) do nothing;

do $$
begin
  if to_regprocedure('public.capture_admin_audit()') is not null then
    execute 'drop trigger if exists audit_home_visual_blocks on public.home_visual_blocks';
    execute 'create trigger audit_home_visual_blocks after insert or update or delete on public.home_visual_blocks for each row execute function public.capture_admin_audit()';
  end if;
end $$;
