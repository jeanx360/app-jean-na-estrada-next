# JNE App 2.1.0 — Rotas, agenda e lembretes inteligentes

## Passageiro

- perfil público do motorista permanece limpo;
- botão único para solicitar orçamento;
- wizard guiado em seis etapas;
- nome e WhatsApp reaproveitados da conta;
- catálogo de rotas frequentes do motorista;
- origem por endereço ou localização atual;
- destino com sugestões de endereço;
- cálculo de distância e duração;
- data e horário da ida;
- volta opcional, no mesmo dia ou em outra data;
- tempo de espera no local;
- passageiros, bagagens e observações;
- revisão final com mapa antes do envio.

## Motorista

- rotas frequentes com origem e destino estruturados;
- mapa, distância e duração no cadastro da rota;
- espera incluída e permissão de retorno;
- solicitação integrada ao CRM, agenda e notificações existentes;
- ida e volta exibidas separadamente na agenda;
- botões para abrir Google Maps e Waze;
- arquivo de calendário com alarme configurável para ida e volta.

## Banco de dados

Aplicar `supabase/migrations/2.1.0_driver_smart_routes_reminders.sql` antes de validar o fluxo no Preview.

## Configuração de mapas

O servidor utiliza `GOOGLE_MAPS_API_KEY` e `ROUTE_ESTIMATE_SECRET`.
A prévia incorporada do mapa é opcional e utiliza `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`.
