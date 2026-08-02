# JNE App 1.7.0.1 — Hotfix de notícias

## Problema encontrado

A base de recuperação continha `public/data/content-feed.json` com `news: []`. A página dependia exclusivamente desse arquivo estático, portanto exibia o estado vazio mesmo com as fontes RSS disponíveis.

## Correções

- Nova rota server-side `/api/news`.
- Consulta ao vivo dos feeds oficiais do InsideEVs Brasil e Motor1.com.
- Cache de CDN por 30 minutos com conteúdo antigo válido por até 24 horas durante revalidação.
- Fallback para `public/data/content-feed.json` quando as fontes externas estiverem indisponíveis.
- Botão “Tentar novamente” na tela de erro.
- Correção da URL RSS do InsideEVs.
- `npm run build` agora executa a sincronização do conteúdo antes do build.
- Workflow opcional do GitHub atualiza o arquivo estático a cada seis horas.
- Cache da PWA e versão atualizados para 1.7.0.1.

## Banco de dados

Nenhuma alteração SQL é necessária.
