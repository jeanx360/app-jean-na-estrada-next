# JNE App 0.4.0 — PWA e funcionamento offline

1. Extraia o ZIP na raiz do projeto e confirme a substituição dos arquivos.
2. Não é necessário instalar nova dependência.
3. Atualize a versão:

```powershell
npm version 0.4.0 --no-git-tag-version
```

4. Limpe o build e compile:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

5. Confira o visual em `http://localhost:3000/configuracoes`.
6. Envie para o GitHub Pages para testar instalação, atualização e modo offline em ambiente de produção.

> O Service Worker fica desativado durante `npm run dev` para não prender arquivos antigos no cache. O botão de instalação depende do navegador. Em Chrome/Edge ele aparece quando os critérios do PWA forem atendidos. No iPhone, a instalação é feita pelo menu Compartilhar do Safari.
