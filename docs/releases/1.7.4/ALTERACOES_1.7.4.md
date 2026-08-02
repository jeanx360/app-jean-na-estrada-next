# JNE App 1.7.4

## Interface administrativa e estatísticas

- Modo administrador com navegação própria.
- Categorias administrativas na lateral no desktop.
- Menu administrativo recolhível no celular.
- Botão permanente para voltar ao JNE App.
- Página separada de estatísticas.
- Gráfico de acessos dos últimos 30 dias.
- Ranking de páginas e indicadores de conversão.
- Métricas administrativas não contabilizadas como acesso público.
- Identificação oficial do aplicativo atualizada para 1.7.4.

## Banco de dados

Esta entrega mantém a migration já criada para a interface de estatísticas:

`supabase/migrations/1.7.3_admin_interface_analytics.sql`

Execute-a somente se ainda não tiver sido aplicada no Supabase.
