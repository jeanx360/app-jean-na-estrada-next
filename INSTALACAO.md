# JNE App 0.2.0 — Conteúdo real

Esta atualização substitui as páginas demonstrativas de Vídeos, Tutoriais, Aplicativos e Parceiros por conteúdo real e organizado em arquivos de dados.

## Instalação

1. Extraia o ZIP.
2. Copie as pastas `src` e `public` para a raiz do projeto.
3. Confirme a substituição dos arquivos.
4. Execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

## Publicação

```powershell
git add .
git commit -m "feat: adicionar conteudo real ao JNE App"
git push origin main
```

## Conteúdo centralizado

Os dados desta fase ficam em:

```text
src/data/content.ts
```

Isso permite editar vídeos, tutoriais, aplicativos e parceiros sem alterar o código visual das páginas.
