# Instalação — Agenda avançada e administração dos motoristas

## 1. Extrair o ZIP

Extraia o conteúdo diretamente em:

`C:\Users\jean_\app-jean-na-estrada-next`

Confirme a substituição dos arquivos.

## 2. Executar a migration

No SQL Editor do Supabase, execute somente:

`supabase/migrations/1.7.3_driver_admin_agenda.sql`

Não execute `supabase/schema.sql` em um banco que já está em uso.

A migration é reaplicável e usa verificações idempotentes.

## 3. Executar o build limpo

```powershell
Set-Location C:\Users\jean_\app-jean-na-estrada-next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
Test-Path .next\BUILD_ID
```

Após um build bem-sucedido, o último comando deve retornar `True`.
