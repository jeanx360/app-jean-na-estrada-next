# Testes — Agenda avançada e administração dos motoristas

## Central de Agendamentos

1. Abrir `/motorista/reservas`.
2. Testar a busca por nome, telefone, origem e destino.
3. Testar cada filtro de situação.
4. Testar os períodos Hoje, Esta semana, Próximos, Passados e Sem data.
5. Remarcar uma reserva e confirmar a nova data no detalhe, no orçamento e na viagem vinculada.
6. Duplicar uma reserva e confirmar que o novo registro começa em negociação e sem vínculos antigos.
7. Cancelar uma reserva informando motivo.
8. Confirmar que o motivo e a data aparecem no histórico.
9. Confirmar que viagem e orçamento vinculados ficam cancelados.

## Administração dos motoristas

1. Entrar com uma conta administrativa e abrir `/admin/motoristas`.
2. Confirmar os cartões de resumo e as métricas por motorista.
3. Abrir a prévia de um perfil e confirmar que o contador não aumenta por causa da prévia administrativa.
4. Bloquear e reativar uma conta de teste.
5. Remover e reativar o modo motorista.
6. Tirar e publicar novamente a página pública.
7. Filtrar reservas, orçamentos e viagens por motorista.
8. Navegar entre páginas quando houver mais de 40 registros.
9. Excluir um registro de teste de cada tipo e confirmar a mensagem de segurança.
10. Verificar o registro das ações em `/admin/logs`.
11. Confirmar que a própria conta administrativa não oferece bloqueio ou exclusão.

## Build

Executar:

```powershell
npm run build
Test-Path .next\BUILD_ID
```

Resultado esperado após sucesso: `True`.
