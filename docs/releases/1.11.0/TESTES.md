# Testes da JNE App 1.11.0

## Técnicos

- Confirmar branch `release/1.11.0` e versão `1.11.0` em package e package-lock.
- Confirmar `jne-app-v1.11.0` em `public/sw.js`.
- Executar `git diff --check`.
- Executar `npm run build`.
- Confirmar as rotas `/motorista/cartao`, `/motorista/desempenho`, `/admin/estatisticas` e `/m/[slug]` no build.
- Confirmar `/api/health` com versão `1.11.0`.

## Banco

- Criar uma campanha.
- Arquivar e reativar sem apagar o histórico.
- Abrir um link com `src` e `cmp`.
- Confirmar `campaign_id` em `driver_profile_events` e `driver_reservations`.
- Confirmar os RPCs `driver_performance_sources`, `driver_performance_campaigns` e `admin_driver_marketing_summary`.

## Interface

- Gerar QR rápido para cada origem.
- Baixar cartão PNG e QR PNG.
- Copiar e compartilhar link de campanha.
- Ver a origem no painel de desempenho.
- Ver a campanha no ranking após registrar eventos.
- Verificar responsividade no celular.
