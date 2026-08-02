# Testes da 1.13.0

## Automáticos

- Branch e versões sincronizadas em `1.13.0`.
- Migration presente e contendo tabela, trigger, RLS, backfill e RPC.
- Rotas `/motorista/clientes` e `/motorista/clientes/[customerId]` presentes no build.
- `customer_id` presente no tipo de reserva.
- Painel do motorista com acesso ao CRM.
- Reserva detalhada com acesso ao cliente.
- Cache da PWA atualizado.
- `git diff --check` sem erros.
- `/api/health` retornando `1.13.0`.

## Manuais

- Criar uma reserva com telefone novo e confirmar a criação automática do cliente.
- Criar outra reserva com o mesmo telefone e confirmar que não houve duplicação.
- Salvar nome preferido, etiquetas e observações.
- Abrir o WhatsApp a partir do cliente.
- Verificar histórico, receita vinculada e recorrência.
- Arquivar e reativar um cliente.
- Conferir o layout no smartphone.
