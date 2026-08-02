# JNE App 1.7.2 — Reservas, orçamento e recibo

## Objetivo

Transformar a solicitação recebida pelo cartão profissional em um fluxo simples e contínuo:

1. atender o passageiro;
2. gerar orçamento;
3. enviar ou salvar em PDF;
4. confirmar e registrar a viagem;
5. controlar receitas e despesas;
6. gerar recibo.

## Alterações

- progresso visual da reserva em cinco etapas;
- próximo passo recomendado em cada atendimento;
- orçamento vinculado visível dentro da reserva;
- viagem vinculada visível dentro da reserva;
- nova página individual de orçamento;
- impressão e salvamento do orçamento em PDF pelo navegador;
- envio direto do orçamento ao WhatsApp do passageiro;
- nova página de recibo da viagem;
- impressão e salvamento do recibo em PDF;
- envio do recibo ao WhatsApp quando a reserva tiver telefone;
- vínculo `reservation_id` entre reserva e viagem;
- sincronização dos estados da reserva, orçamento e viagem;
- botão de recibo na tela financeira;
- atalhos mais claros no histórico de orçamentos;
- cache e versão atualizados para 1.7.2.

## Banco de dados

Executar somente:

`supabase/migrations/1.7.2_reservation_trip_documents.sql`

A migration é reaplicável e não remove dados.
