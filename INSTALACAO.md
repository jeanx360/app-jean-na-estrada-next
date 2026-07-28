# JNE App 0.3.0 — Paridade funcional

Este pacote adiciona:

- Produtos recomendados;
- Guia do iniciante;
- Calculadora EV x combustão;
- Página de contato;
- Navegação atualizada;
- Home atualizada;
- Versão 0.3.0;
- Controles ainda não funcionais identificados como "em breve".

## Instalação

Copie as pastas `src` para a raiz do projeto e permita substituir os arquivos.

Depois execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

Rotas novas:

- `/produtos`
- `/guia`
- `/calculadora`
- `/contato`
