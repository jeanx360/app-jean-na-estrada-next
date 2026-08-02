# Instalação da 1.11.1

1. Partir da branch limpa `release/1.11.0`.
2. Aplicar o pacote e criar `release/1.11.1`.
3. Executar apenas `supabase/migrations/1.11.1_passenger_conversion.sql` no SQL Editor.
4. Executar os testes locais antes de commit e push.

Não execute `supabase/schema.sql` no banco de produção.
