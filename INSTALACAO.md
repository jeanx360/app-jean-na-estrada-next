# Instalação — JNE App 1.1.1

1. Confirme que a versão 1.1.0 já está instalada.
2. Copie todo o conteúdo desta pasta para a raiz do projeto e confirme as substituições.
3. Não há migração SQL nem nova dependência.
4. Execute:

```powershell
npm version 1.1.1 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

5. Teste no celular ou no modo responsivo do navegador:
   - campo de busca central no cabeçalho;
   - abertura e fechamento do modal;
   - busca por marca, modelo, manual e aplicativo;
   - abertura de um manual no veículo correspondente;
   - filtro automático em `/aplicativos`.

6. Publique:

```powershell
git add .
git commit -m "feat: adicionar busca central no mobile e catalogo dinamico"
git push origin feature/1.1.0
```
