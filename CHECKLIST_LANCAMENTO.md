# Checklist de lançamento — JNE App 1.0

## Contas e permissões

- [ ] Cadastro e confirmação de e-mail
- [ ] Login, logout e recuperação de senha
- [ ] Aceite dos três documentos
- [ ] Perfil, avatar e exclusão de conta comum
- [ ] Conta comum sem acesso VIP
- [ ] Convite VIP válido, expirado, revogado e limite de tentativas
- [ ] Conta bloqueada impedida de acessar áreas privadas
- [ ] Administrador acessa todas as páginas do painel

## Conteúdo e arquivos

- [ ] Vídeos e notícias atualizados
- [ ] Tutoriais, aplicativos, parceiros e produtos publicados
- [ ] Upload de imagem pública
- [ ] Upload e download de arquivo VIP
- [ ] Download registrado nas métricas
- [ ] Links externos abrem corretamente

## Notificações

- [ ] Ativação e desativação do Web Push
- [ ] Envio para todos, membros, VIP e administradores
- [ ] Preferências por categoria
- [ ] Sino, contador e leitura sincronizados
- [ ] Clique no push abre a rota configurada

## Dispositivos

- [ ] Chrome/Edge no computador
- [ ] Android pelo navegador e PWA instalado
- [ ] iPhone pelo Safari e PWA na Tela de Início
- [ ] Navegação mobile sem elementos cortados
- [ ] Temas escuro, claro, vermelho, verde e azul
- [ ] Atualização do Service Worker sem conteúdo antigo

## Segurança e lançamento

- [ ] RLS habilitado em todas as tabelas privadas
- [ ] Buckets `vip-files` privado, `public-assets` e `avatars` públicos conforme planejado
- [ ] `.env.local` fora do Git
- [ ] Chaves secretas somente na Vercel
- [ ] Logs administrativos registrando alterações
- [ ] Termos e privacidade revisados antes da divulgação oficial
- [ ] Backup/tag da última versão estável
- [ ] Domínio alterado somente após a bateria de testes
