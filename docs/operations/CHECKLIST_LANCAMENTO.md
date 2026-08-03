# Checklist de lançamento — JNE App 2.0.0

## Infraestrutura e domínio

- [ ] `jneapp.app` aponta para o projeto correto da Vercel
- [ ] `NEXT_PUBLIC_APP_URL=https://jneapp.app`
- [ ] Supabase URL e publishable key configuradas
- [ ] chave de service role configurada somente no servidor
- [ ] VAPID configurado quando Web Push estiver ativo
- [ ] `CRON_SECRET` configurado
- [ ] `AUTOMATION_CRON_SECRET` configurado ou coberto por `CRON_SECRET`
- [ ] Preview validado antes de promover para produção
- [ ] backup, branch e tag de lançamento criados

## Contas e documentos

- [ ] cadastro e confirmação de e-mail
- [ ] checkbox legal obrigatório no cadastro
- [ ] aceite das versões 2.0.0 de Termos e Privacidade
- [ ] login, logout e recuperação de senha
- [ ] perfil, avatar e exclusão de conta comum
- [ ] conta bloqueada impedida de acessar áreas privadas
- [ ] administrador acessa todas as páginas administrativas

## Planos e acesso

- [ ] plano Gratuito liberando apenas recursos previstos
- [ ] plano Profissional liberando CRM, agenda, orçamentos, financeiro e exportações
- [ ] plano Premium liberando desempenho, campanhas, relatórios, personalização e rede
- [ ] teste, validade, suspensão e expiração exibidos corretamente
- [ ] fluxo manual de pagamento conferido
- [ ] preços e condições comerciais revisados no JNE App e no provedor externo

## Conteúdo, comunidade e motorista

- [ ] vídeos, notícias, tutoriais, aplicativos e manuais atualizados
- [ ] comunidade, denúncias e moderação testadas
- [ ] perfil público do motorista sem telefone exposto indevidamente
- [ ] reserva, CRM, agenda, orçamento, financeiro e recibo testados
- [ ] rede de motoristas e autorização do passageiro testadas
- [ ] notificações e automações sem duplicidade
- [ ] painel executivo e exportação administrativa protegidos

## Onboarding, suporte e PWA

- [ ] `/comecar` testado com visitante, membro e motorista
- [ ] `/suporte` revisado
- [ ] e-mail de suporte funcionando
- [ ] instalação no Android
- [ ] instalação no iPhone pelo Safari
- [ ] instalação no computador
- [ ] atualização do Service Worker
- [ ] tela offline
- [ ] atalhos do manifesto

## Dispositivos e acessibilidade

- [ ] Chrome e Edge no computador
- [ ] Android em 320 px, 360 px e 412 px
- [ ] iPhone em largura pequena
- [ ] menu e rodapé sem overflow
- [ ] formulários com teclado e foco visível
- [ ] temas escuro, claro, vermelho, verde e azul
- [ ] redução de movimento respeitada
- [ ] textos e botões com contraste aceitável

## Segurança e operação

- [ ] RLS habilitado nas tabelas privadas
- [ ] buckets privados e públicos conforme planejado
- [ ] `.env.local` fora do Git e do ZIP
- [ ] APIs privadas retornando bloqueio sem login
- [ ] cron rejeitando segredo inválido
- [ ] logs administrativos registrando ações sensíveis
- [ ] suporte orientado a nunca pedir senha
- [ ] revisão profissional dos documentos jurídicos e condições comerciais
- [ ] plano de reversão para a `release/1.20.0`
