# Auditoria de acesso administrativo — JNE App 1.7.3

## Recursos que já existiam

Antes desta atualização, o administrador já tinha acesso a:

- visão geral do sistema;
- contas, funções member/VIP/admin, bloqueio, reativação e exclusão;
- assinatura e pagamentos;
- comunidade VIP e moderação;
- convites, recados e notificações;
- conteúdo público, manuais, carrossel e conteúdo VIP;
- logs de auditoria.

## Lacunas encontradas

Faltavam recursos dedicados para:

- identificar todos os usuários que atuam ou já atuaram como motoristas;
- suspender apenas o modo motorista sem necessariamente excluir a conta;
- retirar imediatamente o cartão profissional do ar;
- enxergar reservas, orçamentos e viagens de todos os motoristas;
- excluir registros operacionais como administrador;
- acompanhar acessos às páginas públicas e conversões básicas.

## Recursos adicionados

A nova área `/admin/motoristas` cobre essas lacunas e mantém três níveis de ação:

1. **Conta:** bloquear, reativar ou excluir completamente.
2. **Motorista:** ativar ou remover o modo profissional e publicar ou retirar o cartão do ar.
3. **Operação:** consultar e excluir reservas, orçamentos e viagens.

## Proteções

- Todas as ações exigem sessão administrativa no servidor.
- Operações privilegiadas usam a chave administrativa apenas no servidor.
- A conta administrativa atual não pode ser bloqueada, perder o modo motorista ou ser excluída pela própria tela.
- Outras contas com função `admin` não podem ser excluídas até que a função administrativa seja removida.
- Exclusões e alterações administrativas são registradas em `admin_audit_logs`.
- A prévia administrativa da página pública não aumenta as métricas de acesso.

## Métricas disponíveis

Por motorista:

- visualizações totais da página pública;
- visualizações nos últimos 30 dias;
- cliques no WhatsApp;
- formulários de reserva iniciados;
- solicitações enviadas;
- total de reservas;
- total de orçamentos;
- total de viagens.

O rastreamento existente evita contar repetidamente o mesmo visitante, evento e página em uma janela de seis horas. O navegador também evita repetir a visualização na mesma sessão diária. Portanto, as métricas representam acessos contabilizados e não cada atualização manual da página.
