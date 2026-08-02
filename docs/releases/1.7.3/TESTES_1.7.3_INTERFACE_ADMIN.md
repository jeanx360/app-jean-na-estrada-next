# Testes — Interface administrativa 1.7.3

## Desktop

- Entrar com uma conta administradora.
- Abrir `/admin`.
- Confirmar que o menu comum não aparece.
- Confirmar sidebar administrativa à esquerda e conteúdo à direita.
- Abrir todas as categorias do menu.
- Confirmar destaque da categoria ativa.
- Usar `Voltar ao JNE App` e confirmar retorno ao menu tradicional.

## Celular

- Abrir `/admin` em largura pequena.
- Confirmar botão de menu no topo.
- Abrir e fechar a sidebar.
- Confirmar que o conteúdo não fica escondido sob o menu.
- Confirmar botão `Voltar` sempre visível.
- Abrir páginas com formulários longos e listas administrativas.

## Estatísticas

- Executar a migration.
- Navegar por algumas páginas fora de `/admin`.
- Aguardar alguns segundos e abrir `/admin/estatisticas`.
- Confirmar gráfico, total de acessos e páginas mais acessadas.
- Atualizar a mesma página repetidamente em menos de 30 minutos e confirmar que não aumenta continuamente.
- Confirmar que abrir páginas administrativas não aumenta os acessos.
- Confirmar que prévia administrativa de motorista não aumenta métricas.

## Segurança

- Acessar `/admin` com conta comum e confirmar redirecionamento.
- Confirmar que somente a função SQL administrativa lê as métricas.
- Confirmar que a API não aceita caminhos `/admin`, `/api` e `/_next`.
