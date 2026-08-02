# JNE App 1.7.3 — Agenda no painel do motorista

## Alterações

- Adicionado o bloco **Agenda do motorista** abaixo do cartão Próximo serviço.
- Adicionado resumo de compromissos de **Hoje**.
- Adicionado resumo do **restante da semana**, até domingo.
- Os dados vêm das reservas reais com data informada e status ativo:
  - nova;
  - em negociação;
  - orçamento enviado;
  - confirmada.
- Cada item mostra:
  - data no padrão `dd/mm/aaaa`;
  - hora no padrão de 24 horas;
  - passageiro;
  - trajeto ou serviço;
  - status;
  - acesso direto à reserva.
- Layout responsivo com duas colunas em telas maiores e uma coluna no celular.

## Arquivos substituídos

- `src/app/motorista/page.tsx`
- `src/app/globals.css`

## Banco de dados

Não existe migration SQL nesta atualização.
