# JNE App 1.14.0 - Agenda e reservas avancadas

## Entrega

- Nova rota `/motorista/agenda` com calendario mensal e painel diario.
- Navegacao rapida entre calendario e lista de reservas.
- Bloqueio de dia inteiro ou intervalo de horario.
- Prevencao de conflito entre reservas e bloqueios.
- Intervalo configuravel entre corridas.
- Duracao padrao configuravel para novas reservas.
- Duracao individual editavel durante a remarcacao.
- Novo estado `in_progress` para corridas em andamento.
- Acesso ao CRM preservado dentro da reserva.
- Origem, campanha, orcamento, financeiro e historico preservados.

## Banco de dados

A migration `1.14.0_driver_advanced_schedule.sql` adiciona:

- `driver_schedule_blocks`;
- `driver_reservations.duration_minutes`;
- `driver_reservations.started_at`;
- `driver_reservations.completed_at`;
- `driver_settings.schedule_buffer_minutes`;
- `driver_settings.default_reservation_duration_minutes`;
- funcao centralizada de deteccao de conflitos;
- trigger de protecao contra sobreposicao.

## Fora do escopo

- pagamentos;
- mapa em tempo real;
- disparo automatico de mensagens;
- alteracao da logica do CRM;
- exclusao de recursos anteriores.
