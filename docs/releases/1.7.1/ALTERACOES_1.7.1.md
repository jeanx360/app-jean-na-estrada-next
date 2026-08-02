# JNE App 1.7.1 — Cartão profissional e reservas

## Objetivo

Transformar a Área do Motorista em uma ferramenta usada no dia a dia para captar clientes particulares, organizar solicitações, gerar orçamentos e alimentar o controle financeiro já existente.

## Entregas

### Cartão profissional público

- Configuração guiada em três passos.
- Nome profissional, cidade, região, WhatsApp e apresentação.
- Veículo, passageiros, bagagens, disponibilidade e comodidades.
- Endereço público simples: `/m/nome-do-motorista`.
- Três opções visuais: escuro, azul e verde.
- Publicação e pausa de reservas controladas pelo motorista.
- Nenhum dado privado da conta é exibido.

### Serviços e pacotes

- Serviços com preço fixo, “a partir de”, por hora ou sob consulta.
- Rota, duração, descrição e itens incluídos.
- Possibilidade de ocultar um serviço sem apagá-lo.
- Passageiro pode escolher um pacote antes de enviar a solicitação.

### QR Code e divulgação

- QR permanente ligado ao perfil público.
- Download do QR em PNG.
- Geração de cartão vertical em PNG para impressão, Stories e WhatsApp.
- Copiar link, compartilhar e abrir a página pública.

### Central de reservas

- Solicitação sem cadastro para o passageiro.
- Nome, WhatsApp, rota, data, horário, passageiros, bagagens e observações.
- Status: nova, negociação, orçamento enviado, confirmada, concluída, cancelada e recusada.
- Botão direto para conversar pelo WhatsApp.
- Dados carregados automaticamente na calculadora de orçamento.
- Ao salvar o orçamento, a reserva é ligada ao orçamento e marcada como enviada.

### Notificação especial

- Notificação interna direcionada somente ao motorista correto.
- Web Push direcionado quando autorizado.
- Vibração e alerta interno quando o JNE App estiver aberto.
- A notificação de reserva fica separada das notificações gerais.

### Métricas iniciais

- Visualizações do perfil.
- Cliques no WhatsApp.
- Início e envio de solicitações.
- Origem por perfil, QR ou link compartilhado.

## Segurança

- RLS no Supabase.
- Reservas privadas e visíveis somente ao motorista dono.
- Perfis bloqueados ou que não sejam motoristas profissionais não ficam públicos.
- Honeypot e limite de solicitações por visitante.
- Telefone do passageiro nunca é exibido publicamente.
- Notificações de reserva usam `target_user_id` e não são enviadas para outros usuários.

## Dependências novas

- `qrcode`
- `@types/qrcode`

## Banco de dados

É obrigatório executar:

`supabase/migrations/1.7.1_driver_public_profile_reservations.sql`

Não execute o arquivo `schema.sql` sobre um banco já existente.
