# Instalação — JNE App 1.4.4

1. Copie as pastas `src` e `public` para a raiz do projeto.
2. Confirme a substituição dos arquivos.
3. Atualize a versão:

```powershell
npm version 1.4.4 --no-git-tag-version
```

4. Limpe o build e compile:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

5. Não existe migração do Supabase nesta atualização.

6. Depois do deploy, encerre as sessões antigas uma vez:
   - saia da conta na janela normal;
   - saia da conta na janela InPrivate/anônima;
   - feche as duas janelas;
   - abra novamente e teste com contas diferentes.
