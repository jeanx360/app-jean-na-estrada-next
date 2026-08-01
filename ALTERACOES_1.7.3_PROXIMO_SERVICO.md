# JNE App 1.7.3 — Próximo serviço

## Alterações

- Adiciona o cartão **Próximo serviço** diretamente abaixo dos quatro acessos rápidos da Área do Motorista.
- Exibe apenas a próxima reserva com status `confirmed` e data futura.
- Respeita o fuso `America/Sao_Paulo` para decidir se um compromisso de hoje ainda está por acontecer.
- Mostra data, horário, passageiro, trajeto, status e acesso direto à reserva.
- Adiciona estado vazio com atalho para os agendamentos.
- Adapta o cartão para celular, tablet e desktop.

## Arquivos substituídos

- `src/app/motorista/page.tsx`
- `src/app/globals.css`

## Banco de dados

Não existe migration SQL nesta alteração.
