# JNE App 0.1.1 — Sistema de temas

## Incluído

- Temas Escuro, Claro, Vermelho, Verde e Azul.
- Seletor com bolinhas no cabeçalho.
- Troca instantânea em todas as páginas.
- Preferência salva no `localStorage`.
- Tema aplicado antes da interface aparecer, evitando a piscada do tema padrão.
- Atualização dinâmica da cor da barra do navegador/PWA.
- Correção do manifesto compatível com `output: "export"`.

## Instalação

1. Extraia o ZIP.
2. Copie a pasta `src` para a raiz do projeto.
3. Confirme a substituição dos arquivos existentes.
4. Execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

Acesse `http://localhost:3000` e teste as cinco bolinhas no cabeçalho.

## Publicação

```powershell
git add .
git commit -m "feat: adicionar sistema de temas"
git push origin main
```
