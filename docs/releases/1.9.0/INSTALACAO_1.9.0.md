# INSTALAÇÃO — JNE APP 1.9.0

## Ordem obrigatória

1. Partir da versão 1.8.1 com Git limpo.
2. Criar a branch `release/1.9.0`.
3. Extrair o ZIP na raiz oficial do projeto.
4. Aplicar no Supabase a migration:
   `supabase/migrations/1.9.0_public_content_editorial_workflow.sql`
5. Executar build limpo.
6. Publicar primeiro na Vercel Preview.
7. Validar o painel `/admin/publicacoes`.

## Observação

A migration precisa ser aplicada antes de usar a nova tela, porque o painel passa a consultar as colunas `publication_status` e `archived_at`.

Não executar `supabase/schema.sql` inteiro em produção.
