# Instalação — JNE App 1.5.2

1. Copie `src` e `public` para a raiz do projeto.
2. Execute:

```powershell
npm version 1.5.2 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

3. Publique e atualize o PWA.
4. Teste um vídeo da home e um vídeo da página `/videos`.

Não há migração do Supabase nem nova variável de ambiente.
