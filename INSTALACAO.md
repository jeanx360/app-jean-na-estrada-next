# JNE App 0.1.2 — Tema Escuro preto

## Alteração

- O tema Escuro agora usa preto e cinzas neutros como base.
- O tema Azul permanece separado, com fundo azulado.
- Claro, Vermelho, Verde e Azul não foram alterados.
- A bolinha do tema Escuro agora é preta.
- A cor padrão do PWA e da barra do navegador foi atualizada para preto.

## Instalação

1. Extraia o ZIP.
2. Copie a pasta `src` para a raiz do projeto.
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
git commit -m "style: diferenciar tema escuro do tema azul"
git push origin main
```
