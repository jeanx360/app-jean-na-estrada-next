# JNE App 1.7.3.1 — correção de build

## Correção

- Corrigido o mapa de categorias da tela administrativa de notificações.
- Adicionada a categoria `reservations` com o rótulo `Reservas`.
- Os mapas de público e categoria agora usam `Record<...>` para que o TypeScript detecte automaticamente categorias ausentes no futuro.

## Arquivo substituído

- `src/app/admin/notificacoes/page.tsx`

## Migration SQL

Não existe migration SQL nesta correção.
