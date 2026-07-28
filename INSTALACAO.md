# Correção SQL — JNE App 0.9.0

Substitua o arquivo `supabase/migrations/0.9.0_notifications.sql` pelo arquivo deste pacote.

Depois, no Supabase:

1. Abra **SQL Editor → New query**.
2. Cole todo o conteúdo do arquivo corrigido.
3. Clique em **Run**.

A migração é idempotente e pode ser executada novamente mesmo que alguns objetos tenham sido criados na tentativa anterior.

Correção aplicada:

```sql
on conflict (source_key) where source_key is not null do nothing;
```
