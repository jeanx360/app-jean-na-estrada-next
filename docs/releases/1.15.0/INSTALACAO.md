# Instalação — JNE App 1.15.0

1. Parta da branch limpa `release/1.14.0` e da versão `1.14.0`.
2. Execute o instalador incluído no pacote.
3. O instalador cria `release/1.15.0` e copia somente os arquivos da entrega.
4. Execute no SQL Editor do Supabase somente:

   `supabase/migrations/1.15.0_driver_professional_quotes.sql`

5. Não execute o `supabase/schema.sql` completo em produção.
6. Rode o teste automatizado incluído no pacote.
7. Somente depois do build aprovado faça commit e push.

A migration é idempotente e preserva os orçamentos existentes. Propostas antigas recebem token, validade, composição inicial e evento de importação.
