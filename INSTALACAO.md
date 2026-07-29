# Instalação — JNE App 1.2.2

1. Extraia o ZIP.
2. Copie `src` e `public` para a raiz do projeto e confirme as substituições.
3. Execute:

```powershell
npm version 1.2.2 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

Não existe migração do Supabase nesta atualização.

## Testes

- Teste larguras de 360 px, 390 px, 430 px e 768 px.
- Confirme dois atalhos por linha.
- Em 380 px ou menos, confirme que somente as descrições dos atalhos são ocultadas.
- Abra o menu e confirme que o card “JNE APP 2.0” não aparece.
- Passe por todos os slides e confirme que títulos longos não ultrapassam as laterais.
- Atualize ou reinstale o PWA caso o navegador mantenha CSS antigo em cache.
