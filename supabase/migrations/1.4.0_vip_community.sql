-- JNE App 1.4.0 — Comunidade VIP
-- Execute depois das migrações 1.3.0 e 1.3.1.

create extension if not exists pgcrypto;

create or replace function public.community_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_blocked = false
      and (
        p.role = 'admin'
        or (
          p.role = 'vip'
          and exists (
            select 1
            from public.vip_entitlements e
            where e.user_id = p.id
              and e.is_active = true
              and e.starts_at <= now()
              and (e.expires_at is null or e.expires_at > now())
          )
        )
      )
  );
$$;

revoke all on function public.community_has_access() from public, anon;
grant execute on function public.community_has_access() to authenticated;


-- Expõe aos participantes somente os campos públicos necessários para autoria.
create or replace function public.community_list_profiles(target_ids uuid[])
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role public.member_role
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.role
  from public.profiles p
  where public.community_has_access()
    and p.id = any(target_ids);
$$;

revoke all on function public.community_list_profiles(uuid[]) from public, anon;
grant execute on function public.community_list_profiles(uuid[]) to authenticated;

create table if not exists public.community_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text not null default 'message-circle',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_member_restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_post boolean not null default true,
  can_comment boolean not null default true,
  restricted_until timestamptz,
  reason text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.community_can_post()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.community_has_access()
    and not exists (
      select 1
      from public.community_member_restrictions r
      where r.user_id = auth.uid()
        and r.can_post = false
        and (r.restricted_until is null or r.restricted_until > now())
    );
$$;

create or replace function public.community_can_comment()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.community_has_access()
    and not exists (
      select 1
      from public.community_member_restrictions r
      where r.user_id = auth.uid()
        and r.can_comment = false
        and (r.restricted_until is null or r.restricted_until > now())
    );
$$;

revoke all on function public.community_can_post() from public, anon;
revoke all on function public.community_can_comment() from public, anon;
grant execute on function public.community_can_post() to authenticated;
grant execute on function public.community_can_comment() to authenticated;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.community_categories(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 3 and 4000),
  image_path text,
  poll_question text check (poll_question is null or char_length(poll_question) between 3 and 180),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_feed_idx
  on public.community_posts(is_hidden, is_pinned desc, created_at desc);
create index if not exists community_posts_category_idx
  on public.community_posts(category_id, created_at desc);
create index if not exists community_posts_author_idx
  on public.community_posts(author_id, created_at desc);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.community_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx
  on public.community_comments(post_id, created_at asc);
create index if not exists community_comments_parent_idx
  on public.community_comments(parent_comment_id, created_at asc);

create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.community_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists community_poll_options_post_idx
  on public.community_poll_options(post_id, sort_order asc);

create unique index if not exists community_poll_options_unique_label_idx
  on public.community_poll_options(post_id, lower(label));

create or replace function public.validate_community_poll_option()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.community_posts p
    where p.id = new.post_id
      and p.poll_question is not null
  ) then
    raise exception 'A publicação não possui uma enquete ativa.' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' and (
    select count(*)
    from public.community_poll_options o
    where o.post_id = new.post_id
  ) >= 6 then
    raise exception 'Uma enquete pode ter no máximo seis opções.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists community_poll_options_validate on public.community_poll_options;
create trigger community_poll_options_validate
before insert or update of post_id, label on public.community_poll_options
for each row execute function public.validate_community_poll_option();

create table if not exists public.community_poll_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  option_id uuid not null references public.community_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists community_poll_votes_option_idx
  on public.community_poll_votes(option_id);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'misinformation', 'copyright', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  constraint community_reports_target_check check (
    (target_type = 'post' and post_id is not null and comment_id is null)
    or
    (target_type = 'comment' and comment_id is not null and post_id is null)
  )
);

create index if not exists community_reports_status_idx
  on public.community_reports(status, created_at desc);

create unique index if not exists community_reports_open_unique
  on public.community_reports(reporter_id, target_type, coalesce(post_id, comment_id))
  where status = 'pending';

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  notification_type text not null check (notification_type in ('comment', 'reply', 'moderation')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists community_notifications_user_idx
  on public.community_notifications(user_id, is_read, created_at desc);

-- Registra somente alterações feitas por administradores no log já existente.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'community_categories',
    'community_member_restrictions',
    'community_posts',
    'community_comments',
    'community_reports'
  ]
  loop
    execute format('drop trigger if exists %I_admin_audit on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_admin_audit after insert or update or delete on public.%I for each row execute function public.capture_admin_audit()',
      table_name,
      table_name
    );
  end loop;
end $$;

-- updated_at

drop trigger if exists community_categories_set_updated_at on public.community_categories;
create trigger community_categories_set_updated_at
before update on public.community_categories
for each row execute function public.set_updated_at();

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
before update on public.community_comments
for each row execute function public.set_updated_at();

-- Impede respostas encadeadas além de um nível e votos incompatíveis.
create or replace function public.validate_community_comment_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record public.community_comments%rowtype;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select * into parent_record
  from public.community_comments
  where id = new.parent_comment_id;

  if not found or parent_record.post_id <> new.post_id then
    raise exception 'Comentário pai inválido.' using errcode = '23514';
  end if;

  if parent_record.parent_comment_id is not null then
    new.parent_comment_id := parent_record.parent_comment_id;
  end if;

  return new;
end;
$$;

drop trigger if exists community_comments_validate_parent on public.community_comments;
create trigger community_comments_validate_parent
before insert or update of parent_comment_id, post_id on public.community_comments
for each row execute function public.validate_community_comment_parent();

create or replace function public.validate_community_poll_vote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.community_poll_options o
    where o.id = new.option_id and o.post_id = new.post_id
  ) then
    raise exception 'Opção não pertence à enquete informada.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists community_poll_votes_validate_option on public.community_poll_votes;
create trigger community_poll_votes_validate_option
before insert or update on public.community_poll_votes
for each row execute function public.validate_community_poll_vote();

create or replace function public.protect_community_post_moderation_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.author_id is distinct from old.author_id
       or new.is_pinned is distinct from old.is_pinned
       or new.is_locked is distinct from old.is_locked
       or new.is_hidden is distinct from old.is_hidden
       or new.hidden_reason is distinct from old.hidden_reason then
      raise exception 'Campos de moderação só podem ser alterados por administradores.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_protect_moderation on public.community_posts;
create trigger community_posts_protect_moderation
before update on public.community_posts
for each row execute function public.protect_community_post_moderation_fields();

create or replace function public.protect_community_comment_moderation_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.author_id is distinct from old.author_id
       or new.post_id is distinct from old.post_id
       or new.parent_comment_id is distinct from old.parent_comment_id
       or new.is_hidden is distinct from old.is_hidden
       or new.hidden_reason is distinct from old.hidden_reason then
      raise exception 'Campos de moderação só podem ser alterados por administradores.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_comments_protect_moderation on public.community_comments;
create trigger community_comments_protect_moderation
before update on public.community_comments
for each row execute function public.protect_community_comment_moderation_fields();

-- RLS
alter table public.community_categories enable row level security;
alter table public.community_member_restrictions enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_comment_likes enable row level security;
alter table public.community_poll_options enable row level security;
alter table public.community_poll_votes enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_notifications enable row level security;

grant select, insert, update, delete on public.community_categories to authenticated;
grant select, insert, update, delete on public.community_member_restrictions to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_post_likes to authenticated;
grant select, insert, update, delete on public.community_comments to authenticated;
grant select, insert, update, delete on public.community_comment_likes to authenticated;
grant select, insert, update, delete on public.community_poll_options to authenticated;
grant select, insert, update, delete on public.community_poll_votes to authenticated;
grant select, insert, update, delete on public.community_reports to authenticated;
grant select, insert, update, delete on public.community_notifications to authenticated;

-- Categorias
drop policy if exists "VIP reads community categories" on public.community_categories;
create policy "VIP reads community categories"
on public.community_categories for select to authenticated
using (public.community_has_access());

drop policy if exists "Admins insert community categories" on public.community_categories;
create policy "Admins insert community categories"
on public.community_categories for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins update community categories" on public.community_categories;
create policy "Admins update community categories"
on public.community_categories for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete community categories" on public.community_categories;
create policy "Admins delete community categories"
on public.community_categories for delete to authenticated
using (public.is_admin());

-- Restrições
drop policy if exists "Members read own community restriction" on public.community_member_restrictions;
create policy "Members read own community restriction"
on public.community_member_restrictions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins insert community restrictions" on public.community_member_restrictions;
create policy "Admins insert community restrictions"
on public.community_member_restrictions for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins update community restrictions" on public.community_member_restrictions;
create policy "Admins update community restrictions"
on public.community_member_restrictions for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete community restrictions" on public.community_member_restrictions;
create policy "Admins delete community restrictions"
on public.community_member_restrictions for delete to authenticated
using (public.is_admin());

-- Postagens
drop policy if exists "VIP reads visible community posts" on public.community_posts;
create policy "VIP reads visible community posts"
on public.community_posts for select to authenticated
using (
  public.community_has_access()
  and (is_hidden = false or author_id = auth.uid() or public.is_admin())
);

drop policy if exists "VIP creates own community posts" on public.community_posts;
create policy "VIP creates own community posts"
on public.community_posts for insert to authenticated
with check (
  author_id = auth.uid()
  and public.community_can_post()
  and (image_path is null or split_part(image_path, '/', 1) = auth.uid()::text)
  and is_pinned = false
  and is_hidden = false
);

drop policy if exists "Authors update own community posts" on public.community_posts;
create policy "Authors update own community posts"
on public.community_posts for update to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (
  (
    author_id = auth.uid()
    and public.community_can_post()
    and (image_path is null or split_part(image_path, '/', 1) = auth.uid()::text)
  )
  or public.is_admin()
);

drop policy if exists "Authors delete own community posts" on public.community_posts;
create policy "Authors delete own community posts"
on public.community_posts for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

-- Curtidas de post
drop policy if exists "VIP reads community post likes" on public.community_post_likes;
create policy "VIP reads community post likes"
on public.community_post_likes for select to authenticated
using (public.community_has_access());

drop policy if exists "VIP likes community posts" on public.community_post_likes;
create policy "VIP likes community posts"
on public.community_post_likes for insert to authenticated
with check (user_id = auth.uid() and public.community_has_access());

drop policy if exists "VIP removes own post likes" on public.community_post_likes;
create policy "VIP removes own post likes"
on public.community_post_likes for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Comentários
drop policy if exists "VIP reads visible community comments" on public.community_comments;
create policy "VIP reads visible community comments"
on public.community_comments for select to authenticated
using (
  public.community_has_access()
  and (is_hidden = false or author_id = auth.uid() or public.is_admin())
);

drop policy if exists "VIP creates own community comments" on public.community_comments;
create policy "VIP creates own community comments"
on public.community_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and public.community_can_comment()
  and is_hidden = false
  and exists (
    select 1 from public.community_posts p
    where p.id = post_id and p.is_hidden = false and p.is_locked = false
  )
);

drop policy if exists "Authors update own community comments" on public.community_comments;
create policy "Authors update own community comments"
on public.community_comments for update to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (
  (author_id = auth.uid() and public.community_can_comment())
  or public.is_admin()
);

drop policy if exists "Authors delete own community comments" on public.community_comments;
create policy "Authors delete own community comments"
on public.community_comments for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

-- Curtidas de comentário
drop policy if exists "VIP reads community comment likes" on public.community_comment_likes;
create policy "VIP reads community comment likes"
on public.community_comment_likes for select to authenticated
using (public.community_has_access());

drop policy if exists "VIP likes community comments" on public.community_comment_likes;
create policy "VIP likes community comments"
on public.community_comment_likes for insert to authenticated
with check (user_id = auth.uid() and public.community_has_access());

drop policy if exists "VIP removes own comment likes" on public.community_comment_likes;
create policy "VIP removes own comment likes"
on public.community_comment_likes for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Enquetes
drop policy if exists "VIP reads community poll options" on public.community_poll_options;
create policy "VIP reads community poll options"
on public.community_poll_options for select to authenticated
using (public.community_has_access());

drop policy if exists "Authors insert poll options" on public.community_poll_options;
create policy "Authors insert poll options"
on public.community_poll_options for insert to authenticated
with check (
  exists (
    select 1 from public.community_posts p
    where p.id = post_id and (p.author_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Admins update poll options" on public.community_poll_options;
create policy "Admins update poll options"
on public.community_poll_options for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authors delete poll options" on public.community_poll_options;
create policy "Authors delete poll options"
on public.community_poll_options for delete to authenticated
using (
  exists (
    select 1 from public.community_posts p
    where p.id = post_id and (p.author_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "VIP reads community poll votes" on public.community_poll_votes;
create policy "VIP reads community poll votes"
on public.community_poll_votes for select to authenticated
using (public.community_has_access());

drop policy if exists "VIP votes in community polls" on public.community_poll_votes;
create policy "VIP votes in community polls"
on public.community_poll_votes for insert to authenticated
with check (
  user_id = auth.uid()
  and public.community_has_access()
  and exists (
    select 1 from public.community_posts p
    where p.id = post_id and p.is_hidden = false and p.is_locked = false
  )
);

drop policy if exists "VIP changes own poll vote" on public.community_poll_votes;
create policy "VIP changes own poll vote"
on public.community_poll_votes for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "VIP removes own poll vote" on public.community_poll_votes;
create policy "VIP removes own poll vote"
on public.community_poll_votes for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Denúncias
drop policy if exists "Members read own community reports" on public.community_reports;
create policy "Members read own community reports"
on public.community_reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "VIP creates community reports" on public.community_reports;
create policy "VIP creates community reports"
on public.community_reports for insert to authenticated
with check (reporter_id = auth.uid() and public.community_has_access());

drop policy if exists "Admins update community reports" on public.community_reports;
create policy "Admins update community reports"
on public.community_reports for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete community reports" on public.community_reports;
create policy "Admins delete community reports"
on public.community_reports for delete to authenticated
using (public.is_admin());

-- Notificações internas
drop policy if exists "Admins insert community notifications" on public.community_notifications;
create policy "Admins insert community notifications"
on public.community_notifications for insert to authenticated
with check (public.is_admin());

drop policy if exists "Members read own community notifications" on public.community_notifications;
create policy "Members read own community notifications"
on public.community_notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Members update own community notifications" on public.community_notifications;
create policy "Members update own community notifications"
on public.community_notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Members delete own community notifications" on public.community_notifications;
create policy "Members delete own community notifications"
on public.community_notifications for delete to authenticated
using (user_id = auth.uid());

-- Cria notificações de comentário e resposta sem expor permissão de insert aos clientes.
create or replace function public.notify_community_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  parent_author uuid;
begin
  select author_id into post_author
  from public.community_posts
  where id = new.post_id;

  if post_author is not null and post_author <> new.author_id then
    insert into public.community_notifications (
      user_id, actor_id, notification_type, post_id, comment_id, message
    ) values (
      post_author, new.author_id, 'comment', new.post_id, new.id,
      'Sua publicação recebeu um novo comentário.'
    );
  end if;

  if new.parent_comment_id is not null then
    select author_id into parent_author
    from public.community_comments
    where id = new.parent_comment_id;

    if parent_author is not null
       and parent_author <> new.author_id
       and parent_author is distinct from post_author then
      insert into public.community_notifications (
        user_id, actor_id, notification_type, post_id, comment_id, message
      ) values (
        parent_author, new.author_id, 'reply', new.post_id, new.id,
        'Seu comentário recebeu uma resposta.'
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_community_comment() from public, anon, authenticated;

drop trigger if exists community_comments_notify on public.community_comments;
create trigger community_comments_notify
after insert on public.community_comments
for each row execute function public.notify_community_comment();

-- Storage privado da comunidade.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-images',
  'community-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "VIP uploads own community images" on storage.objects;
create policy "VIP uploads own community images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.community_can_post()
);

drop policy if exists "VIP reads community images" on storage.objects;
create policy "VIP reads community images"
on storage.objects for select to authenticated
using (
  bucket_id = 'community-images'
  and public.community_has_access()
);

drop policy if exists "Authors delete own community images" on storage.objects;
create policy "Authors delete own community images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'community-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- Categorias iniciais. O administrador pode editar ou desativar depois.
insert into public.community_categories (slug, name, description, icon, sort_order)
values
  ('geral', 'Geral', 'Conversas e novidades da comunidade.', 'messages-square', 10),
  ('duvidas', 'Dúvidas', 'Perguntas para outros proprietários e entusiastas.', 'circle-help', 20),
  ('byd', 'BYD', 'Modelos, manutenção, aplicativos e experiências com BYD.', 'car-front', 30),
  ('geely', 'Geely', 'Conteúdo e experiências com veículos Geely.', 'car-front', 40),
  ('gwm', 'GWM', 'Conteúdo e experiências com veículos GWM.', 'car-front', 50),
  ('recarga', 'Recarga', 'Estações, custos, rotas e infraestrutura.', 'plug-zap', 60),
  ('manutencao', 'Manutenção', 'Revisões, peças, oficinas e cuidados.', 'wrench', 70),
  ('aplicativos', 'Aplicativos', 'Apps, multimídia, compatibilidade e tutoriais.', 'smartphone', 80),
  ('viagens', 'Viagens', 'Rotas, autonomia e relatos de estrada.', 'route', 90)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;
