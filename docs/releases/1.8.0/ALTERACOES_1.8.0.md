# JNE App 1.8.0 — Identidade visual própria

## Alterações

- substitui a marca antiga do cabeçalho pela identidade JNE App;
- mantém o caminho existente `src/assets/logo-jean-na-estrada.png` para evitar alteração desnecessária nos componentes;
- substitui ícones PWA de 192 e 512 pixels;
- adiciona ícone maskable de 512 pixels com área segura;
- substitui Apple Touch Icon;
- substitui favicons PNG e ICO;
- adiciona os arquivos de convenção do Next.js em `src/app/icon.png`, `src/app/apple-icon.png` e `src/app/favicon.ico`;
- atualiza `src/app/manifest.ts` para declarar os ícones PWA corretamente;
- atualiza a versão para 1.8.0 em `package.json`, `package-lock.json`, `/api/health` e `public/sw.js`;
- atualiza o precache do service worker.

## Banco de dados

Nenhuma migration.

## Observação

O nome antigo do arquivo `logo-jean-na-estrada.png` foi mantido apenas por compatibilidade com o código atual. O conteúdo do arquivo agora é a marca JNE App.
