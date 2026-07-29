# JNE App 1.2.0

## VIP e monetização

- Novo registro de origem do acesso VIP: administrador, convite, YouTube, parceiro, assinatura direta ou legado.
- O papel `vip` passa a ser recalculado com base nos acessos ativos.
- O painel de membros mostra de onde veio cada acesso VIP.
- Convites antigos e contas VIP existentes são preservados na migração.

## Integração com o YouTube

- Conexão OAuth da conta proprietária do canal.
- Token permanente criptografado com AES-256-GCM antes de ser armazenado.
- Sincronização de níveis e membros atuais do canal.
- Sincronização manual pelo administrador e automática diária pela Vercel.
- Página administrativa com métricas, níveis, membros vinculados e erros de sincronização.
- Membro pode vincular a própria conta Google/YouTube e ativar o VIP automaticamente.
- Membro pode verificar novamente ou remover o vínculo.
- Um canal do YouTube só pode ser associado a uma conta do JNE App.
- Cancelamento ou perda da assinatura remove somente o acesso fornecido pelo YouTube; outras origens continuam válidas.

## Privacidade

- Política de Privacidade atualizada para a versão 1.1.0.
- Novo aceite obrigatório após a atualização.
- O JNE App não guarda senha Google, dados de pagamento nem histórico de vídeos.

## Interface

- Nova área `/admin/youtube`.
- Nova área `/membros/youtube`.
- Card de assinatura do YouTube na área de membros.
- Métricas do YouTube no painel administrativo.
- Indicadores da origem VIP na gestão de membros.
