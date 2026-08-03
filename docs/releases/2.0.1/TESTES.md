# Testes — JNE App 2.0.1

## Automáticos

O script de testes valida:

- branch e versões;
- `CACHE_VERSION` do Service Worker;
- ausência de resíduos do instalador;
- arquivos e marcadores essenciais da release;
- `git diff --check`;
- TypeScript com `npm run typecheck`;
- build de produção com `npm run build`;
- versão retornada por `/api/health` em servidor local de produção;
- carregamento das rotas públicas principais.

## Manuais no smartphone

1. Abra **Começar** com o PWA já instalado e confirme o estado **Aplicativo instalado**.
2. Abra **Conta** e confira o card **Conta protegida** em largura pequena.
3. Troque a foto em **Editar perfil** e confirme a atualização no cartão e no perfil público.
4. Remova a foto e confirme o fallback com iniciais.
5. Pesquise `Geely EX5 BEV`, `EX5`, `EX 5` e `manual EX5`.
6. Navegue por páginas secundárias e confirme que **Voltar** retorna ao contexto anterior.
7. Abra uma página diretamente em nova aba e confirme o fallback coerente.
8. Confira o final do perfil público do motorista sem conteúdo coberto pela barra fixa.

## Observação do build

O prebuild pode regenerar `public/data/content-feed.json`. O script restaura esse arquivo quando ele não faz parte da release.
