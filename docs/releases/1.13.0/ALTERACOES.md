# JNE App 1.13.0 — CRM de passageiros

## Entrega

- Carteira privada de clientes em `/motorista/clientes`.
- Cadastro automático a partir das reservas existentes e futuras.
- Agrupamento pelo telefone normalizado, sem duplicar o mesmo passageiro para o motorista.
- Busca por nome, telefone, etiqueta e observações.
- Filtros de clientes recorrentes, inativos há 90 dias e arquivados.
- Etiquetas: frequente, aeroporto, corporativo, VIP e viagem longa.
- Nome preferido e observações privadas que não são sobrescritos por novas reservas.
- Histórico de solicitações, viagens vinculadas e receita registrada.
- Atalho direto para WhatsApp.
- Arquivamento sem apagar o histórico.
- Acesso ao cliente a partir da tela de uma reserva.
- Atalho da carteira no painel do motorista.

## Privacidade

Os dados do CRM permanecem restritos ao próprio motorista por RLS. Esta entrega não expõe nomes, telefones, anotações ou histórico de passageiros no painel administrativo.

## Compatibilidade

Reservas antigas são vinculadas automaticamente durante a migration. Orçamentos e viagens existentes continuam funcionando sem alteração de fluxo.
