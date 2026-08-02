# JNE App 1.10.0 — Inteligência do motorista

## Entrega inicial

- Novo painel VIP em `/motorista/desempenho`.
- Funil: visualização → WhatsApp → formulário iniciado → reserva enviada → viagem concluída.
- Comparação dos últimos 30 dias com os 30 dias anteriores.
- Resultado bruto e líquido das viagens concluídas.
- Origem dos passageiros: acesso direto, QR Code, link compartilhado e WhatsApp.
- Ranking de serviços mais solicitados.
- Dias e horários com maior demanda.
- Identificação de clientes recorrentes pelo telefone normalizado.
- Recomendações simples baseadas no funil do próprio motorista.
- Visão administrativa consolidada da operação dos motoristas.
- Preservação correta da origem `shared_link` nas novas reservas.

## Controle de acesso

O painel detalhado e as RPCs individuais exigem:

- conta autenticada;
- motorista profissional ativo;
- perfil não bloqueado;
- função VIP ou administrador.

Nenhum motorista acessa dados de outro motorista.
