# Testes da versão 1.7.3

## Painel do motorista

- [ ] Abrir `/motorista` com um perfil profissional ativo.
- [ ] Confirmar os quatro botões no topo: QR de divulgação, Calcular viagem, Agendamentos e Home do JNE.
- [ ] Confirmar que o QR abre `/motorista/cartao` quando o perfil público existe.
- [ ] Confirmar que o QR abre `/motorista/perfil-publico` quando o perfil público ainda não existe.
- [ ] Confirmar que Calcular viagem abre `/motorista/calculadora`.
- [ ] Confirmar que Agendamentos abre `/motorista/reservas`.
- [ ] Confirmar que Home do JNE abre a home de conteúdo sem retornar automaticamente ao painel do motorista.
- [ ] Confirmar que o número de novas reservas aparece no botão Agendamentos quando aplicável.

## Responsividade

- [ ] Em celular, confirmar dois botões lado a lado e dois abaixo.
- [ ] Confirmar que nenhum texto ou ícone fica cortado em 320 px de largura.
- [ ] Confirmar que os quatro botões continuam fáceis de tocar.
- [ ] Em desktop, confirmar os quatro acessos em uma única linha.

## Regressão

- [ ] Estatísticas do motorista continuam carregando.
- [ ] Cartão público continua funcionando.
- [ ] Calculadora continua salvando orçamentos.
- [ ] Central de Reservas continua abrindo normalmente.
- [ ] `/api/health` mostra `1.7.3`.
