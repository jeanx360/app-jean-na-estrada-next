# ALTERAÇÕES — JNE APP 1.9.0

## Fluxo editorial de publicações

- Estados próprios para **rascunho**, **publicado** e **arquivado**.
- Conteúdos arquivados deixam de aparecer no aplicativo sem serem excluídos.
- Filtros por busca, tipo e estado no catálogo administrativo.
- Resumo com quantidade de publicados, rascunhos e arquivados.
- Ações rápidas para publicar, voltar a rascunho, arquivar e restaurar.
- Duplicação de publicações como novo rascunho.
- Reordenação por botões Subir e Descer, normalizando a ordem em intervalos de 10.
- Edição do estado editorial diretamente no formulário.

## Segurança e preservação

- Exclusão continua exigindo confirmação explícita.
- Imagens e arquivos usados por outra publicação não são removidos do Storage.
- Duplicações reaproveitam os ativos existentes sem criar cópias desnecessárias.
- Criação, edição, publicação, arquivamento, restauração, duplicação, reordenação e exclusão entram no log administrativo.

## Técnico

- Nova migration `1.9.0_public_content_editorial_workflow.sql`.
- Novas colunas `publication_status` e `archived_at` em `public_contents`.
- Trigger mantém compatibilidade entre `publication_status` e `is_published`.
- `package.json` e `package-lock.json` atualizados para 1.9.0.
- Cache da PWA atualizado para `jne-app-v1.9.0`.
