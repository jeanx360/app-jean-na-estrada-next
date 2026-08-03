# Testes — JNE App 2.0.0

## Versionamento

- branch `release/2.0.0`;
- `package.json` em `2.0.0`;
- duas versões do `package-lock.json` em `2.0.0`;
- Service Worker em `jne-app-v2.0.0`;
- `/api/health` em `2.0.0`.

## Comercial

- domínio padrão `jneapp.app`;
- `/comecar` disponível;
- `/suporte` disponível;
- `/instalar` disponível;
- navegação e rodapé com os novos caminhos;
- manifesto com atalhos e escopo;
- sitemap público atualizado;
- rotas privadas fora do sitemap e bloqueadas no robots.

## Cadastro e documentos

- checkbox legal obrigatório;
- action valida o aceite inicial;
- confirmação leva para `/aceite?next=/comecar`;
- Termos e Privacidade em `2.0.0`;
- textos contemplam planos, motorista, rede, notificações e suporte.

## Interface

- grades responsivas;
- botões em largura total em telas pequenas;
- proteção contra overflow;
- suporte a redução de movimento;
- páginas de erro com suporte;
- tela offline revisada.

## Segurança

- HSTS configurado;
- segredos continuam somente no servidor;
- nenhuma migration destrutiva;
- nenhuma integração automática de pagamento;
- nenhum segredo ou `.env` dentro do pacote.

## Execução

- `git diff --check`;
- `npm run build`;
- servidor local;
- `/api/health`;
- páginas públicas principais;
- rota administrativa protegida sem login.
