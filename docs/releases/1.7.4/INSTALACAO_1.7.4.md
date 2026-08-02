# Instalação — JNE App 1.7.4

1. Extraia o ZIP na raiz oficial do projeto:

   `C:\Users\jean_\app-jean-na-estrada-next`

2. Confirme a substituição dos arquivos.

3. Caso a migration de estatísticas ainda não tenha sido executada, rode no SQL Editor do Supabase:

   `supabase/migrations/1.7.3_admin_interface_analytics.sql`

4. Não execute `supabase/schema.sql` em um banco já utilizado.

5. Execute o build limpo antes do push.
