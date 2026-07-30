# JNE App 1.5.3 — limpeza técnica

## Removido

- Rotas administrativas da sincronização automática de membros do YouTube.
- Rotas de vínculo de Conta Google dos membros.
- Cron antigo de sincronização de membros.
- Bibliotecas e tipos exclusivos do OAuth de membros.
- Documento antigo de configuração do Google OAuth.

## Preservado

- Player interno de vídeos do YouTube.
- Página de vídeos.
- Notificação automática quando um vídeo novo é publicado.
- Cadastro manual de membros do YouTube como VIP.
- Origem `youtube` nos registros manuais do VIP.
- Migrações históricas do Supabase, para manter o histórico do banco consistente.

## Outros ajustes

- `/api/health` atualizado para 1.5.3.
- Service Worker atualizado para o cache 1.5.3.
- `vercel.json` mantém somente o cron útil de notificações de vídeos.
- `.env.example` não contém variáveis do OAuth abandonado.
