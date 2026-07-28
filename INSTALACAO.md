# JNE App 0.5.0 — busca e conteúdo automático

## Instalação

1. Extraia este ZIP na raiz do projeto:
   `C:\Users\jean_\app-jean-na-estrada-next`
2. Confirme a substituição dos arquivos.
3. Atualize a versão:
   `npm version 0.5.0 --no-git-tag-version`
4. Sincronize o conteúdo:
   `node scripts/sync-content.mjs`
5. Limpe o cache do Next.js:
   `Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue`
6. Valide:
   `npm run build`
7. Teste:
   `npm run dev`

## Publicação

```powershell
git add .
git commit -m "feat: adicionar busca e sincronizacao automatica"
git push origin main
```

O GitHub Actions executará a sincronização antes do build e repetirá o processo automaticamente a cada seis horas.
