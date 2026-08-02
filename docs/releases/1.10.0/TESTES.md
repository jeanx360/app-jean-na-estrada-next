# Testes — JNE App 1.10.0

## Banco e segurança

- Migration executa sem erro em banco com as migrations anteriores.
- Motorista VIP acessa as quatro RPCs de desempenho.
- Motorista comum recebe erro de permissão nas RPCs VIP.
- Um motorista nunca recebe dados de outro motorista.
- Administrador acessa o consolidado administrativo.

## Fluxo público

- Acesso com `?src=qr` é registrado como QR.
- Acesso com `?src=shared_link` é registrado como link compartilhado.
- Reserva enviada preserva a origem correta.
- Links antigos e origem `whatsapp` permanecem aceitos.

## Painel do motorista

- `/motorista/desempenho` abre para VIP/admin.
- Conta não VIP é direcionada para a página VIP.
- Funil, receita, origens, serviços e demanda renderizam com e sem dados.
- Valores financeiros aparecem em real brasileiro.
- Layout funciona no desktop e celular.

## Administração

- Estatísticas mostram viagens concluídas, receita e resultado líquido.
- A página continua funcionando antes da migration, exibindo aviso em vez de quebrar.

## Técnico

- `npm run build`.
- `git diff --check`.
- `/api/health` retorna `1.10.0`.
- `public/sw.js` contém `jne-app-v1.10.0`.
