# Instalação da 1.13.0

1. Partir da branch limpa `release/1.12.0`.
2. Aplicar o pacote na raiz do projeto.
3. Executar somente `supabase/migrations/1.13.0_driver_customer_crm.sql` no SQL Editor do Supabase.
4. Rodar os testes e o build local.
5. Criar commit e enviar `release/1.13.0` para Preview da Vercel.

Não execute `supabase/schema.sql` inteiro em produção.
