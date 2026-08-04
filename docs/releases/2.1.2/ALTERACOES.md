# JNE App 2.1.2 — Perfil visual e isolamento de notificações

## Segurança e privacidade

- As rotas de notificações agora filtram explicitamente avisos globais e avisos destinados à conta autenticada.
- Contas administrativas deixam de receber, no sino normal do aplicativo, notificações privadas de outros usuários.
- Leitura, arquivamento e restauração validam o destinatário antes de alterar o estado.
- As políticas RLS de `notifications` e `notification_reads` foram reforçadas.
- Alertas antigos de reservas sem destinatário são reparados pela migration quando a reserva permite identificar o motorista correto.

## Perfil público do motorista

- Foto do veículo como banner opcional no topo do cartão profissional.
- Upload e remoção pelo motorista, com prévia no smartphone.
- Foto do motorista integrada ao banner.
- Tema Escuro corrigido para preto verdadeiro e renomeado para Preto.
- Administração da foto, visibilidade e tema no painel de motoristas.
- Bucket público dedicado, com escrita limitada à pasta do próprio motorista.

## Banco

Aplicar `supabase/migrations/2.1.2_notification_isolation_vehicle_banner.sql` antes de validar upload e isolamento em produção.
