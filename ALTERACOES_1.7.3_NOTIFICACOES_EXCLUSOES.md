# JNE App 1.7.3 — notificações e exclusões

## Notificações

- O sino carrega somente notificações ainda não lidas.
- Ao abrir o sino, as notificações exibidas são marcadas automaticamente como lidas.
- O contador do sino é zerado e atualizado imediatamente.
- Depois que o painel é fechado, as notificações lidas não aparecem novamente no sino.
- Na página de histórico, o filtro “Somente não lidas” passa a iniciar ativado.
- As notificações lidas desaparecem da lista ativa, mas continuam disponíveis no histórico ao desativar o filtro.
- O comportamento também foi aplicado a visitantes sem login usando o armazenamento local do navegador.

## Exclusão de viagens e orçamentos

- Adicionado botão de exclusão diretamente na lista de viagens.
- Adicionado botão de exclusão diretamente na lista de orçamentos.
- Toda exclusão exige confirmação.
- Ao excluir uma viagem, seus lançamentos financeiros são removidos em cascata pelo banco.
- Se a viagem veio de uma reserva, a reserva volta para um estado coerente de negociação/orçamento.
- Ao excluir um orçamento vinculado a uma viagem, a viagem permanece, mas perde o vínculo com o orçamento.
- As exclusões continuam protegidas pelas políticas RLS e também filtram pelo usuário conectado.

## Arquivos alterados

- `src/components/NotificationBell.tsx`
- `src/components/NotificationCenter.tsx`
- `src/components/DriverRecordDeleteButton.tsx`
- `src/app/api/notificacoes/recentes/route.ts`
- `src/app/motorista/orcamentos/page.tsx`
- `src/app/motorista/financeiro/page.tsx`
- `src/app/globals.css`

## Banco de dados

Não existe migration SQL nesta atualização.
