-- JNE App 1.7.5
-- Corrige o acesso anônimo aos perfis públicos de motoristas sem liberar
-- leitura direta da tabela public.profiles para visitantes.

begin;

create or replace function public.can_view_published_driver_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles as p
    where p.id = target_user_id
      and p.is_professional_driver is true
      and coalesce(p.is_blocked, false) is false
  );
$function$;

revoke all on function public.can_view_published_driver_profile(uuid) from public;
grant execute on function public.can_view_published_driver_profile(uuid) to anon, authenticated;

drop policy if exists "Visitors read published driver profiles"
  on public.driver_public_profiles;

create policy "Visitors read published driver profiles"
on public.driver_public_profiles
for select
to anon, authenticated
using (
  user_id = auth.uid()
  or (
    is_published is true
    and public.can_view_published_driver_profile(user_id)
  )
);

commit;
