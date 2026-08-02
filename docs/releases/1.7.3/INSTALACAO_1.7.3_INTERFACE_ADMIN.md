# Instalação — Interface administrativa 1.7.3

1. Extraia o ZIP na raiz oficial:

   `C:\Users\jean_\app-jean-na-estrada-next`

2. Confirme a substituição dos arquivos.

3. No Supabase SQL Editor, execute somente:

   `supabase/migrations/1.7.3_admin_interface_analytics.sql`

4. Não execute `supabase/schema.sql` no banco em uso.

5. Execute o build limpo:

```powershell
Set-Location C:\Users\jean_\app-jean-na-estrada-next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
Test-Path .next\BUILD_ID
```

6. Como a Política de Privacidade foi atualizada para a versão 1.6.0, o aplicativo solicitará uma nova aceitação legal no primeiro acesso autenticado.

7. Inicie o aplicativo e teste:

```powershell
npm start
```
