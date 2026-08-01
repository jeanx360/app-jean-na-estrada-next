# Correção de build Tailwind — JNE App 1.6.1.2

Este pacote corrige o erro:

`Module not found: Can't resolve 'tailwindcss'`

## Instalação

1. Extraia o ZIP na raiz do projeto e substitua os arquivos.
2. No terminal do VS Code, execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run build
```

3. Confirme o build:

```powershell
Test-Path .next\BUILD_ID
```

O resultado deve ser `True`.

4. Inicie:

```powershell
npm start
```

## Arquivos alterados

- `package.json`
- `postcss.config.mjs`
- `src/app/api/health/route.ts`
- `public/sw.js`

O arquivo `.env.local` não é alterado.
