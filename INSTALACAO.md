# Instalação — JNE App 1.4.6

1. Copie `src` e `public` para a raiz do projeto.
2. Confirme a substituição.
3. Execute:

```powershell
npm version 1.4.6 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

Não há migração do Supabase.
