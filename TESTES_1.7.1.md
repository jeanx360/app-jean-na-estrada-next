# Testes — JNE App 1.7.1

## Preparação

- [ ] Migração SQL 1.7.1 executada sem erros.
- [ ] `npm install` concluído.
- [ ] `npm run build` concluído.
- [ ] `/api/health` mostra `1.7.1`.

## Motorista

- [ ] Ative “Sou motorista profissional” no perfil.
- [ ] Abra `/motorista`.
- [ ] Crie o cartão em `/motorista/perfil-publico`.
- [ ] Salve como rascunho e confirme que a página pública não abre.
- [ ] Publique e confirme que `/m/slug` abre sem login.
- [ ] Edite veículo, região e comodidades.
- [ ] Cadastre pelo menos dois serviços.
- [ ] Oculte um serviço e confirme que ele some da página pública.
- [ ] Abra `/motorista/cartao` e baixe o QR e o cartão PNG.

## Passageiro

- [ ] Abra a página pública em janela anônima.
- [ ] Clique no WhatsApp.
- [ ] Clique em “Tenho interesse” e confirme o serviço pré-selecionado.
- [ ] Envie uma solicitação com rota, data e WhatsApp.
- [ ] Confirme a tela de sucesso.
- [ ] Tente uma data anterior e confirme o bloqueio.

## Reserva e orçamento

- [ ] A reserva aparece em `/motorista/reservas`.
- [ ] O sino mostra a notificação somente na conta do motorista.
- [ ] O alerta interno aparece para uma nova solicitação recente.
- [ ] O botão WhatsApp abre a conversa com mensagem pronta.
- [ ] Atualize a reserva para “Em negociação”.
- [ ] Abra “Gerar orçamento”.
- [ ] Nome, origem, destino e data aparecem preenchidos.
- [ ] Salve o orçamento.
- [ ] A reserva muda para “Orçamento enviado”.

## Segurança

- [ ] Outra conta não consegue ler a reserva.
- [ ] Passageiro não consegue acessar a Central de Reservas.
- [ ] Dados privados não aparecem no cartão público.
- [ ] Perfil bloqueado deixa de ficar disponível publicamente.

## Regressão

- [ ] Notícias carregam.
- [ ] Vídeos abrem no YouTube.
- [ ] Área VIP abre.
- [ ] Comunidade abre.
- [ ] Financeiro atual abre.
- [ ] Login, logout e menu de perfil funcionam.
