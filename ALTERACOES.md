# JNE App 0.9.0 — notificações e comunicação

## Central de notificações

- Nova página `/notificacoes`.
- Avisos para visitantes, membros, VIP ou administradores.
- Categorias: geral, vídeos, tutoriais, aplicativos e benefícios.
- Contador de notificações não lidas no cabeçalho.
- Marcar individualmente ou todas como lidas.
- Limpar avisos já lidos.
- Estado sincronizado no Supabase para usuários autenticados.
- Estado local no navegador para visitantes.

## Web Push

- Implementação própria usando Push API, Service Worker e VAPID.
- Não depende do OneSignal.
- Preferências por categoria na página `/configuracoes`.
- Assinatura vinculada à conta quando o usuário entra.
- Segmentação por público e papel do membro.
- Assinaturas expiradas são desativadas automaticamente.

## Administração

- Nova página `/admin/notificacoes`.
- Publicação na central interna.
- Envio Web Push opcional.
- Histórico de sucessos e falhas.
- Reenvio de push.
- Publicar, despublicar e excluir.
- Destaques na página inicial.

## Conteúdo público

- Ao criar tutorial, aplicativo, parceiro ou produto, o administrador pode:
  - Criar aviso na central;
  - Enviar Web Push;
  - Destacar o aviso na página inicial.

## Automação de vídeos

- Cron diário da Vercel consulta o feed oficial do canal.
- Cria apenas uma notificação por vídeo.
- Envia Web Push quando as chaves estiverem configuradas.
- Endpoint protegido por `CRON_SECRET`.

## Segurança

- RLS nas novas tabelas.
- Chave secreta do Supabase usada somente no servidor.
- Chave VAPID privada usada somente no servidor.
- Rotas de notificações e configurações fora do cache do PWA.
