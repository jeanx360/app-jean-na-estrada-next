-- JNE App 1.9.0 — fluxo editorial das publicações públicas
-- Aplicar uma única vez no SQL Editor do Supabase antes de publicar a versão 1.9.0.
-- Migration idempotente: pode ser reaplicada com segurança.

begin;

alter table public.public_contents
  add column if not exists publication_status text;

alter table public.public_contents
  add column if not exists archived_at timestamptz;

update public.public_contents
set publication_status = case
  when is_published then 'published'
  else 'draft'
end
where publication_status is null
   or publication_status not in ('draft', 'published', 'archived');

alter table public.public_contents
  alter column publication_status set default 'draft';

alter table public.public_contents
  alter column publication_status set not null;

do $$
begin
  alter table public.public_contents
    add constraint public_contents_publication_status_check
    check (publication_status in ('draft', 'published', 'archived'));
exception
  when duplicate_object then null;
end $$;

create index if not exists public_contents_editorial_status_idx
  on public.public_contents(publication_status, content_type, sort_order, updated_at desc);

create or replace function public.sync_public_content_editorial_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.publication_status = 'published' or coalesce(new.is_published, false) then
      new.publication_status := 'published';
    elsif new.publication_status = 'archived' then
      new.publication_status := 'archived';
    else
      new.publication_status := 'draft';
    end if;
  else
    if new.publication_status is distinct from old.publication_status then
      null;
    elsif new.is_published is distinct from old.is_published then
      new.publication_status := case when new.is_published then 'published' else 'draft' end;
    end if;
  end if;

  new.is_published := new.publication_status = 'published';

  if new.publication_status = 'published' then
    new.published_at := coalesce(new.published_at, now());
    new.archived_at := null;
  elsif new.publication_status = 'archived' then
    new.published_at := null;
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.published_at := null;
    new.archived_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists public_contents_sync_editorial_status on public.public_contents;
create trigger public_contents_sync_editorial_status
before insert or update of publication_status, is_published, published_at, archived_at
on public.public_contents
for each row execute function public.sync_public_content_editorial_status();

commit;
