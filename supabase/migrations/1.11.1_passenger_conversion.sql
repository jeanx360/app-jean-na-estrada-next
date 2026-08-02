-- JNE App 1.11.1 - Conversao rapida do passageiro
-- Execute depois da migration 1.11.0_driver_marketing_links.sql.

alter table public.driver_profile_events
  drop constraint if exists driver_profile_events_event_type_check;

alter table public.driver_profile_events
  add constraint driver_profile_events_event_type_check
  check (event_type in (
    'profile_view',
    'whatsapp_click',
    'reservation_cta',
    'reservation_started',
    'reservation_submitted',
    'contact_save',
    'profile_share'
  ));

comment on column public.driver_profile_events.event_type is
  'Acao publica no perfil: visualizacao, WhatsApp, CTA de reserva, inicio/envio da reserva, contato salvo ou compartilhamento.';
