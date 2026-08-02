# TESTES — JNE APP 1.9.0

## Banco

- Migration aplicada sem erro.
- Conteúdos antigos convertidos para publicado ou rascunho corretamente.
- Reaplicação da migration não gera duplicação.

## Administração

- Criar rascunho.
- Criar publicação já publicada.
- Editar e arquivar.
- Restaurar arquivado para rascunho.
- Publicar um rascunho.
- Duplicar e confirmar que a cópia nasce como rascunho.
- Mover conteúdo para cima e para baixo.
- Filtrar por tipo, estado e busca.
- Conferir registros em `/admin/logs`.

## Preservação

- Duplicar conteúdo com imagem e excluir apenas uma das cópias.
- Confirmar que a imagem permanece na outra publicação.
- Repetir o teste com aplicativo hospedado.

## Público

- Conteúdo publicado aparece na página pública correta.
- Rascunho não aparece.
- Arquivado não aparece.

## Técnico

- Build limpo.
- `/api/health` retorna 1.9.0.
- Menu mostra 1.9.0.
- `public/sw.js` usa `jne-app-v1.9.0`.
