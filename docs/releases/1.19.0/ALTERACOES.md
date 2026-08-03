# JNE App 1.19.0 — Automações e notificações

## Central profissional

- Nova central privada em `/motorista/notificacoes`.
- Alertas com categoria, prioridade, data e link direto para a ação relacionada.
- Filtros por situação, área e prioridade.
- Marcação individual ou coletiva como lida.
- Arquivamento e restauração dos alertas.
- Preferências do motorista para agenda, clientes, orçamentos, financeiro, rede, assinatura e alterações administrativas.
- Antecedência configurável para reservas, orçamentos e acompanhamento de clientes.
- Layout responsivo para telas pequenas e proteção contra estouro horizontal.
- Atalho de Alertas no painel do motorista e integração com o sino global de notificações.

## Automações internas

- Reserva confirmada próxima.
- Reserva próxima ainda não confirmada.
- Orçamento próximo do vencimento.
- Orçamento vencido sem resposta.
- Pagamento de viagem pendente.
- Cliente autorizado sem contato recente.
- Indicação recebida pela rede de motoristas.
- Assinatura ou período de teste próximo do vencimento.
- Alteração administrativa de plano ou assinatura.
- Revisão financeira mensal.

## Segurança e operação

- Execução consolidada pelo endpoint protegido `/api/automacoes/run`.
- Compatibilidade com `AUTOMATION_CRON_SECRET` e fallback para `CRON_SECRET`.
- Comparação segura do segredo no servidor.
- Rotina idempotente baseada em `source_key`, sem duplicar alertas em execuções repetidas.
- Histórico técnico privado em `/admin/automacoes`.
- Execução manual exclusiva para administradores.
- Isolamento por usuário com RLS no Supabase.
- Expiração automática de alertas operacionais antigos.
- Agendamento diário registrado no `vercel.json`.

## Limites preservados

As automações apenas criam alertas internos. Esta versão não envia WhatsApp, SMS ou e-mail, não altera reservas, não realiza cobranças, não entra em contato com passageiros e não usa serviços pagos de push para os alertas profissionais.
