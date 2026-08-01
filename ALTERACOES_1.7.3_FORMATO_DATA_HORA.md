# JNE App 1.7.3 — padrão brasileiro de data e hora

## Objetivo

Padronizar todas as datas e horários visíveis no JNE App para o formato utilizado no Brasil:

- data: `dd/mm/aaaa`;
- horário: `HH:mm`, em ciclo de 24 horas;
- data e horário: `dd/mm/aaaa às HH:mm`;
- segundos são mantidos apenas nos logs administrativos: `dd/mm/aaaa às HH:mm:ss`.

## Implementação

- criada a centralização em `src/lib/date-time.ts`;
- definido o fuso `America/Sao_Paulo` para timestamps;
- removidas formatações dispersas com `dateStyle`, `timeStyle`, `toLocaleString` e `toLocaleDateString`;
- corrigidas telas públicas, área do motorista, notificações, comunidade, VIP e administração;
- os campos de data e hora receberam `lang="pt-BR"`;
- o formulário público do passageiro informa claramente `dd/mm/aaaa` e horário de 24 horas;
- nenhuma estrutura ou valor salvo no Supabase foi alterado.

## Arquivos incluídos

- `src/lib/date-time.ts`
- `src/lib/driver-public.ts`
- `src/lib/community.ts`
- `src/components/DriverQuoteCalculator.tsx`
- `src/components/AdminInviteForm.tsx`
- `src/components/PublicReservationForm.tsx`
- `src/components/AdminHomeCarouselForm.tsx`
- `src/components/AccountChip.tsx`
- `src/components/DriverFinancialEntryForm.tsx`
- `src/components/LiveVideoGrid.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/DriverQuoteShareButton.tsx`
- `src/components/DriverTripForm.tsx`
- `src/components/NewsFeed.tsx`
- `src/app/motorista/page.tsx`
- `src/app/membros/page.tsx`
- `src/app/notificacoes/page.tsx`
- `src/app/vip/page.tsx`
- `src/app/admin/membros/page.tsx`
- `src/app/admin/home/page.tsx`
- `src/app/admin/notificacoes/page.tsx`
- `src/app/admin/convites/page.tsx`
- `src/app/admin/recados/page.tsx`
- `src/app/admin/assinatura/page.tsx`
- `src/app/admin/comunidade/page.tsx`
- `src/app/admin/logs/page.tsx`
- `src/app/api/motorista/reservas/route.ts`
- `src/app/motorista/reservas/page.tsx`
- `src/app/motorista/financeiro/page.tsx`
- `src/app/motorista/orcamentos/page.tsx`
- `src/app/motorista/orcamentos/[quoteId]/page.tsx`
- `src/app/motorista/financeiro/[tripId]/page.tsx`
- `src/app/motorista/financeiro/[tripId]/recibo/page.tsx`
- `src/app/motorista/reservas/[reservationId]/page.tsx`

## Banco de dados

Não existe migration SQL nesta atualização.
