-- JNE App 1.3.1 — integridade dos cargos e correção da aprovação de assinatura
-- Execute depois da migração 1.3.0.

-- Recalcula somente member/vip. Um administrador nunca pode ser rebaixado por
-- login, aceite de termos, expiração de VIP ou sincronização automática.
create or replace function public.refresh_member_vip_role(target_user_id uuid)
returns public.member_role
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.member_role;
  next_role public.member_role;
begin
  if auth.uid() is not null
    and auth.uid() <> target_user_id
    and not public.is_admin()
  then
    raise exception 'Você não pode recalcular o acesso de outra conta.' using errcode = '42501';
  end if;

  select role
  into current_role
  from public.profiles
  where id = target_user_id
  for update;

  if current_role is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;

  if current_role = 'admin' then
    return 'admin';
  end if;

  if exists (
    select 1
    from public.vip_entitlements e
    where e.user_id = target_user_id
      and e.is_active = true
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
  ) then
    next_role := 'vip';
  else
    next_role := 'member';
  end if;

  update public.profiles
  set role = next_role
  where id = target_user_id
    and role <> 'admin'
    and role is distinct from next_role;

  return next_role;
end;
$$;

revoke all on function public.refresh_member_vip_role(uuid) from public, anon;
grant execute on function public.refresh_member_vip_role(uuid) to authenticated;

-- Corrige a criação do acesso VIP ao aprovar um pedido de assinatura.
create or replace function public.admin_review_subscription_request(
  target_request_id uuid,
  approve_request boolean,
  entitlement_expires_at timestamptz default null,
  entitlement_no_expiry boolean default false,
  review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.vip_subscription_requests%rowtype;
  normalized_expiry timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select *
  into request_row
  from public.vip_subscription_requests
  where id = target_request_id
  for update;

  if request_row.id is null then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Este pedido já foi analisado.' using errcode = '22023';
  end if;

  if approve_request then
    normalized_expiry := case
      when entitlement_no_expiry then null
      else entitlement_expires_at
    end;

    if not entitlement_no_expiry and normalized_expiry is null then
      raise exception 'Informe a validade ou marque sem validade.' using errcode = '22023';
    end if;

    if normalized_expiry is not null and normalized_expiry <= now() then
      raise exception 'A validade precisa estar no futuro.' using errcode = '22023';
    end if;

    insert into public.vip_entitlements (
      user_id,
      source,
      source_key,
      label,
      starts_at,
      expires_at,
      is_active,
      metadata
    ) values (
      request_row.user_id,
      'subscription',
      request_row.id::text,
      'Assinatura direta do JNE App',
      now(),
      normalized_expiry,
      true,
      jsonb_build_object(
        'request_id', request_row.id,
        'payment_method', request_row.payment_method,
        'amount_cents', request_row.amount_cents,
        'approved_by', auth.uid()
      )
    )
    on conflict (user_id, source, source_key)
    do update set
      label = excluded.label,
      starts_at = now(),
      expires_at = excluded.expires_at,
      is_active = true,
      metadata = excluded.metadata,
      updated_at = now();

    update public.vip_subscription_requests
    set
      status = 'approved',
      admin_notes = nullif(trim(review_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
    where id = target_request_id;
  else
    update public.vip_subscription_requests
    set
      status = 'rejected',
      admin_notes = nullif(trim(review_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
    where id = target_request_id;
  end if;

  perform public.refresh_member_vip_role(request_row.user_id);
end;
$$;

revoke all on function public.admin_review_subscription_request(uuid, boolean, timestamptz, boolean, text)
  from public, anon;
grant execute on function public.admin_review_subscription_request(uuid, boolean, timestamptz, boolean, text)
  to authenticated;
