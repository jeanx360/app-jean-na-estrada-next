# Instalação da JNE App 1.20.0

1. Inicie na branch limpa `release/1.19.0` com a versão `1.19.0`.
2. Extraia o pacote fora da raiz do projeto.
3. Execute `_jne_install/APLICAR_JNE_APP_1.20.0.ps1`.
4. No SQL Editor do Supabase, execute somente:

   `supabase/migrations/1.20.0_admin_executive_dashboard.sql`

5. Não execute o `supabase/schema.sql` completo.
6. Execute `_jne_install/TESTAR_JNE_APP_1.20.0.ps1`.
7. Depois do build aprovado, faça commit e push da branch `release/1.20.0`.

O instalador não cria commit, não envia arquivos ao GitHub e não publica na Vercel.
