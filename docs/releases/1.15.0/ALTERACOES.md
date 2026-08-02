# JNE App 1.15.0 — Orçamentos profissionais

## Objetivo

Transformar o orçamento simples em uma proposta comercial completa, conectada ao CRM, às reservas, à agenda e ao financeiro do motorista.

## Entregas

- criação de orçamento a partir de cliente do CRM ou reserva;
- criação manual para passageiro ainda não cadastrado;
- validade configurável entre 1 e 90 dias;
- estados: rascunho, enviado, visualizado, aceito, recusado, expirado, concluído e cancelado;
- adicionais separados para pedágio, estacionamento, período noturno, paradas, retorno, bagagem e outros custos;
- desconto, valor mínimo, reserva operacional e arredondamento;
- página pública em `/orcamento/[token]`;
- aceite ou recusa pelo passageiro, sem login;
- criação ou confirmação automática da reserva após o aceite;
- preservação de cliente, origem e campanha quando o orçamento nasce de uma reserva;
- envio por WhatsApp com link público;
- impressão e salvamento em PDF pelo navegador;
- histórico de criação, edição, visualização e resposta;
- métricas de visualização, aceite e conversão na lista de orçamentos;
- edição de propostas ainda abertas sem trocar o link público;
- integração direta a partir do CRM e da tela da reserva.

## Fora do escopo

- cobrança ou pagamento online;
- assinatura eletrônica avançada;
- mapa e cálculo automático de rota;
- emissão fiscal.
