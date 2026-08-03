# Guia operacional de suporte — JNE App 2.0.0

## Informações mínimas para um chamado

Solicitar:

- e-mail da conta;
- dispositivo;
- sistema operacional;
- navegador;
- rota onde ocorreu o problema;
- horário aproximado;
- mensagem de erro;
- captura de tela quando necessária.

Nunca solicitar:

- senha;
- token de sessão;
- chave de service role;
- segredo de cron;
- chave VAPID privada;
- conteúdo completo de `.env.local`.

## Ordem de diagnóstico

1. confirmar endereço `jneapp.app`;
2. confirmar conexão;
3. fechar e abrir o PWA;
4. aceitar atualização disponível;
5. testar pelo navegador sem instalação;
6. verificar `/api/health` sem expor segredos;
7. verificar logs da Vercel;
8. verificar Auth, RLS e logs do Supabase;
9. reproduzir no Preview da branch;
10. documentar correção e versão.

## Problemas comuns

### Versão antiga

- aplicar atualização do PWA;
- fechar todas as janelas;
- limpar dados do site somente quando necessário;
- reinstalar pela rota `/instalar`.

### E-mail não recebido

- conferir Spam e abas automáticas;
- validar endereço informado;
- conferir configuração de e-mail no Supabase;
- gerar novo fluxo sem revelar se a conta existe.

### Recurso bloqueado

- conferir plano, status e validade;
- revisar atribuição administrativa;
- confirmar se o recurso exige Profissional ou Premium.

### Dados do motorista ausentes

- confirmar usuário autenticado;
- conferir modo motorista no perfil;
- revisar RLS e `user_id`/`driver_user_id`;
- não editar dados diretamente sem registrar o motivo.
