# Instalação — JNE App 1.10.0

1. Iniciar a partir da branch limpa `release/1.9.1`.
2. Executar o instalador do pacote para criar `release/1.10.0` e copiar os arquivos.
3. Executar no SQL Editor do Supabase apenas:
   - `supabase/migrations/1.10.0_driver_intelligence.sql`
4. Executar build limpo.
5. Validar localmente e publicar como Vercel Preview.
6. Testar com uma conta de motorista VIP e uma conta sem VIP.
7. Somente depois fazer commit, push e promover a release.

Não execute `supabase/schema.sql` inteiro no banco em produção.
