# Testes — JNE App 1.19.0

- Branch e versões sincronizadas em 1.19.0.
- Cache do PWA e API health atualizados.
- Migration específica presente no schema consolidado.
- Colunas operacionais na tabela de notificações.
- Preferências privadas do motorista com RLS.
- Histórico administrativo das execuções com RLS.
- Função idempotente e chave `source_key` contra duplicações.
- Endpoint de execução protegido por segredo.
- Ausência de envio automático de WhatsApp, SMS, e-mail, cobrança ou alteração de reservas.
- Alertas de agenda, clientes, orçamentos, financeiro, rede e assinatura.
- Central privada com filtros, leitura, arquivamento, restauração e links diretos.
- Integração com o sino de notificações e painel do motorista.
- Administração técnica das automações.
- Layout responsivo em telas grandes e smartphones.
- Build completo.
- API `/api/health` retornando 1.19.0.
- `/api/automacoes/run` respondendo HTTP 401 sem segredo.
- Proteção das rotas privadas sem login, inclusive em redirecionamento streaming do App Router.
