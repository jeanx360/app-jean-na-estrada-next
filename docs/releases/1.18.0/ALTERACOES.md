# JNE App 1.18.0 — Rede de motoristas e indicações

## Entrega

- Diretório público de motoristas verificados em `/motoristas`.
- Participação opcional e controlada pelo próprio motorista.
- Pesquisa por nome, cidade, região, tipo de serviço, veículo, quantidade de passageiros e acessibilidade.
- Cards públicos com foto, veículo, região, serviços e acesso ao cartão profissional existente.
- Verificação, recusa e revisão da participação pelo administrador em `/admin/motoristas`.
- Área Premium `/motorista/rede` com configurações, métricas e histórico de indicações.
- Encaminhamento de reservas para outro motorista verificado somente após confirmação expressa de autorização do passageiro.
- Aceitação da indicação cria uma nova reserva na agenda do motorista destinatário e preserva o vínculo com a indicação original.
- WhatsApp entre motoristas exibido apenas quando o titular autorizou o compartilhamento e o solicitante participa da rede verificada.
- Métricas de visualizações, contatos e indicações enviadas, recebidas e aceitas.
- Origem `network` integrada aos eventos, reservas e relatórios existentes.
- Recurso `driver_network` incluído no plano Premium.

## Limites preservados

A rede não realiza despacho automático, rastreamento em tempo real, pagamento, cobrança de comissão ou distribuição de corridas sem autorização. Cada motorista continua independente e confirma disponibilidade, preço e contratação diretamente com o passageiro.
