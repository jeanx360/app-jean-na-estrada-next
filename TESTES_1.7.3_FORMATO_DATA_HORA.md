# Testes — padrão brasileiro de data e hora

## Formulário público do passageiro

- abrir uma página pública `/m/<slug>`;
- confirmar o texto `Data (dd/mm/aaaa)`;
- confirmar o texto `Horário aproximado (24h)`;
- testar horários como `08:05`, `14:30` e `23:59`;
- enviar uma reserva e confirmar que a notificação mostra data e hora no padrão brasileiro.

## Área do motorista

- conferir o cartão Próximo serviço;
- conferir a Central de Reservas;
- conferir detalhes da reserva;
- conferir orçamentos, financeiro e recibo;
- confirmar que nenhuma tela mostra mês/dia/ano ou AM/PM.

## Outras áreas

- conferir notificações e sino;
- conferir comunidade;
- conferir Área VIP e validade;
- conferir telas administrativas com datas;
- conferir logs, que podem mostrar segundos, mas sempre em 24 horas.

## Validação realizada antes da entrega

- 34 arquivos TypeScript/TSX alterados foram analisados pelo parser do TypeScript sem erro de sintaxe;
- a função central foi testada com data, horário, virada de fuso e meia-noite;
- a varredura do código não encontrou outras formatações visíveis antigas em `src`.

O build completo deve ser confirmado no computador do projeto.
