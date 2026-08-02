# Correção SQL 1.7.1.1

## Problema corrigido

A migration 1.7.1 tinha duas restrições com o mesmo nome em `driver_service_packages`:

- o `check` da coluna `price` recebe automaticamente o nome `driver_service_packages_price_check`;
- outra restrição explícita reutilizava o mesmo nome.

A restrição explícita agora se chama:

```sql
driver_service_packages_price_required_check
```

## Como aplicar

1. Substitua os arquivos do patch na raiz do projeto.
2. No Supabase SQL Editor, abra e execute novamente o arquivo completo:

```text
supabase/migrations/1.7.1_driver_public_profile_reservations.sql
```

O arquivo foi preparado para ser reexecutado: usa `if not exists`, recria policies com segurança e substitui funções existentes.

Não execute `supabase/schema.sql` no banco atual.
