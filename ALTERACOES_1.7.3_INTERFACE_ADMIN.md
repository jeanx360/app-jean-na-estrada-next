# JNE App 1.7.3 — Interface administrativa clean

## Objetivo

Reorganizar integralmente a experiência do administrador, inspirada na referência visual enviada: categorias à esquerda, conteúdo à direita, destaque claro da seção ativa e boa utilização no celular.

## Alterações

- O menu tradicional do JNE App deixa de ser exibido enquanto o administrador está em `/admin`.
- Criado um modo administrador exclusivo, protegido por `requireAdmin()`.
- Sidebar administrativa com todas as rotas existentes organizadas por categoria:
  - Painel;
  - Pessoas e receita;
  - Comunicação;
  - Conteúdo;
  - Sistema.
- Menu lateral recolhível no celular.
- Botão `Voltar` permanente no topo e botão `Voltar ao JNE App` no rodapé da sidebar.
- Página inicial administrativa simplificada, com resumo e ações principais.
- Nova rota `/admin/estatisticas`.
- Gráfico de visualizações e visitantes dos últimos 30 dias.
- Ranking das páginas mais acessadas.
- Métricas de páginas públicas de motoristas e funil de reservas.
- Métricas de contas, VIP e downloads.
- Rastreamento próprio e anônimo de navegação, sem serviço externo.
- Rotas `/admin` não entram nas métricas.
- Prévia administrativa de página de motorista não entra nas métricas.
- Atualização da Política de Privacidade para a versão 1.6.0.

## Privacidade das métricas

A tabela de métricas armazena somente:

- rota acessada;
- horário do acesso;
- hash técnico do visitante.

O endereço IP bruto não é salvo na tabela. A mesma pessoa na mesma página é contabilizada novamente apenas depois de 30 minutos.

## Migration

Executar somente:

`supabase/migrations/1.7.3_admin_interface_analytics.sql`

Não executar `supabase/schema.sql` em um banco já em uso.
