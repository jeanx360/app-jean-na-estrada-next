# Instalação da versão 1.7.2

1. Pare o servidor com `Ctrl + C`.
2. Extraia o patch na raiz do projeto e substitua os arquivos.
3. No Supabase, abra o SQL Editor.
4. Execute todo o arquivo `supabase/migrations/1.7.2_reservation_trip_documents.sql`.
5. Não execute `supabase/schema.sql` no banco existente.
6. No PowerShell:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm install
npm run build
```

7. Confirme:

```powershell
Test-Path .next\BUILD_ID
```

8. Inicie:

```powershell
npm start
```
