# JNE App 1.7.3 — Agenda avançada e administração dos motoristas

## Central de Agendamentos

- Busca por passageiro, telefone, origem, destino, pacote, observações e motivo de cancelamento.
- Filtros por situação e período: hoje, esta semana, próximos, passados e sem data.
- Remarcação de data e horário em 24 horas.
- Sincronização da nova data com orçamento e viagem vinculados.
- Duplicação de uma reserva para criar um novo atendimento.
- Cancelamento ou recusa com motivo obrigatório e histórico do encerramento.
- Ações disponíveis na lista e no detalhe da reserva.

## Administração dos motoristas

Nova área `Administração > Motoristas e viagens` com:

- bloqueio e reativação da conta;
- remoção e reativação do modo motorista;
- publicação ou retirada imediata do perfil público;
- exclusão completa da conta, exceto a própria conta administrativa e outras contas administrativas protegidas;
- métricas de acessos totais e dos últimos 30 dias;
- cliques no WhatsApp;
- formulários de reserva iniciados e enviados;
- totais de reservas, orçamentos e viagens;
- consulta paginada de todos os registros;
- filtro por motorista e tipo de registro;
- exclusão administrativa de reservas, orçamentos e viagens;
- auditoria das ações administrativas.

As aberturas feitas pelo botão de prévia no painel administrativo não são contabilizadas como acesso público.

## Banco de dados

Migration adicionada:

`supabase/migrations/1.7.3_driver_admin_agenda.sql`

Ela adiciona o motivo e a data de cancelamento às reservas, índice para agenda, trigger de consistência e a função administrativa de métricas.
